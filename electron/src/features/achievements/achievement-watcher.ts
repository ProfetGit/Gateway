import fs from 'node:fs'
import path from 'node:path'
import { BrowserWindow } from 'electron'
import { JsonStore } from '../../shared/store'
import { Game } from '../../shared/types'
import { resolveWinePrefix } from '../steam/resolve-wine-prefix'
import { steamService } from '../steam/steam-service'
import { parseAchievementFile, type ParsedAchievement } from './parse-achievement-file'
import { diffUnlocks } from './diff-unlocks'
import { resolveAchievementNames } from './resolve-achievement-name'
import { fetchAchievementDefinitions, type AchievementDefinition } from './steam-achievement-schema'
import { ACHIEVEMENT_FILENAMES, findAchievementFiles, watchDirsFor } from './achievement-file-locations'
import { watchRecursive } from './watch-recursive'

const FRESHNESS_MS = 5000
// A debounce, not a drop-if-recent throttle: writes settle for this long
// before we read the file, so a burst (e.g. a backlog of pre-existing
// progress being granted in one pass) always ends in exactly one full,
// complete read rather than losing whichever events land inside the window.
const DEBOUNCE_MS = 800
const DEFINITIONS_CACHE_TTL = 24 * 60 * 60 * 1000

interface WatchedGame {
    gameId: string
    watchers: fs.FSWatcher[]
}

const watched = new Map<string, WatchedGame>()
const debounceTimers = new Map<string, ReturnType<typeof setTimeout>>()
const definitionsCache = new Map<string, { data: AchievementDefinition[]; fetchedAt: number }>()

function isFresh(filePath: string): boolean {
    try {
        return Date.now() - fs.statSync(filePath).mtimeMs <= FRESHNESS_MS
    } catch {
        return false
    }
}

async function getDefinitions(appId: string | undefined): Promise<AchievementDefinition[]> {
    if (!appId) return []
    const cached = definitionsCache.get(appId)
    if (cached && Date.now() - cached.fetchedAt < DEFINITIONS_CACHE_TTL) return cached.data

    try {
        const result = await fetchAchievementDefinitions(appId)
        if (result.success) {
            definitionsCache.set(appId, { data: result.definitions, fetchedAt: Date.now() })
            return result.definitions
        }
    } catch (err) {
        console.warn('[Achievements] Could not fetch definitions for name resolution:', err)
    }
    return cached?.data ?? []
}

async function processFile(
    store: JsonStore,
    win: BrowserWindow | null,
    gameId: string,
    filePath: string,
) {
    if (!isFresh(filePath)) return

    let parsed: ParsedAchievement[]
    try {
        parsed = await parseAchievementFile(filePath)
    } catch {
        return // half-written file; the next debounced pass will retry
    }
    if (parsed.length === 0) return

    const games = store.get('games')
    const index = games.findIndex((g) => g.id === gameId)
    if (index === -1) return
    const game = games[index] as Game

    const definitions = await getDefinitions(game.metadataAppId)
    const resolved = resolveAchievementNames(parsed, definitions)

    const { newlyUnlocked, merged } = diffUnlocks(resolved, game.manualUnlocks ?? {})
    if (newlyUnlocked.length === 0) return

    // Re-read the current record — the debounce window means time has passed
    // and another write (e.g. the optimistic manual toggle) may have landed.
    const latest = store.updateGames((games) =>
        games.map((g) => (g.id === gameId ? { ...g, manualUnlocks: merged } : g))
    )
    if (!latest.some((g) => g.id === gameId)) return

    console.log(`[Achievements] ${newlyUnlocked.length} unlocked in ${game.title}`)
    win?.webContents.send('achievements-unlocked', {
        gameId,
        gameTitle: game.title,
        unlocked: newlyUnlocked.map((a) => ({ apiname: a.name, unlockTime: a.unlockTime })),
        totalUnlocked: Object.keys(merged).length,
    })
    win?.webContents.send('games-updated', latest)
}

function scheduleProcessFile(store: JsonStore, win: BrowserWindow | null, gameId: string, filePath: string) {
    const existing = debounceTimers.get(gameId)
    if (existing) clearTimeout(existing)

    debounceTimers.set(gameId, setTimeout(() => {
        debounceTimers.delete(gameId)
        void processFile(store, win, gameId, filePath)
    }, DEBOUNCE_MS))
}

/**
 * Records whatever is already unlocked on disk without announcing any of it.
 *
 * Without this, the first file change after adding a game would diff against an
 * empty map and fire a burst of notifications for progress made long before
 * Gateway was watching.
 */
async function seedBaseline(store: JsonStore, gameId: string, filePaths: string[]) {
    let parsed: ParsedAchievement[] = []
    for (const filePath of filePaths) {
        try {
            parsed = parsed.concat(await parseAchievementFile(filePath))
        } catch {
            continue
        }
    }
    if (parsed.length === 0) return

    const games = store.get('games')
    const index = games.findIndex((g) => g.id === gameId)
    if (index === -1) return
    const game = games[index] as Game

    const definitions = await getDefinitions(game.metadataAppId)
    const resolved = resolveAchievementNames(parsed, definitions)

    const known = game.manualUnlocks ?? {}
    const merged = { ...known }
    for (const achievement of resolved) {
        if (!achievement.achieved) continue
        if (merged[achievement.name] !== undefined) continue
        merged[achievement.name] = achievement.unlockTime > 0
            ? achievement.unlockTime
            : Math.floor(Date.now() / 1000)
    }

    if (Object.keys(merged).length === Object.keys(known).length) return

    // Re-read: getDefinitions() above is a network call, so the snapshot taken
    // before it may be minutes old and missing whole sources by now.
    store.updateGames((latest) =>
        latest.map((g) => (g.id === gameId ? { ...g, manualUnlocks: merged } : g))
    )
    console.log(`[Achievements] Baseline for ${game.title}: ${Object.keys(merged).length} already unlocked`)
}

/**
 * Games imported before winePrefix existed have none recorded, and a full sync
 * shouldn't be a prerequisite for achievements to start working — so resolve it
 * here and persist it if found.
 */
function ensureWinePrefix(store: JsonStore, game: Game, steamPath: string | null): string | undefined {
    if (game.winePrefix) return game.winePrefix

    const prefix = resolveWinePrefix({
        exe: game.executablePath,
        launchArgs: game.launchArgs,
        title: game.title,
        steamPath,
        shortcutId: game.shortcutId,
    })
    if (!prefix) return undefined

    store.updateGames((games) =>
        games.map((g) => (g.id === game.id ? { ...g, winePrefix: prefix } : g))
    )
    console.log(`[Achievements] Found prefix for ${game.title}: ${prefix}`)
    return prefix
}

function watchGame(
    store: JsonStore,
    win: BrowserWindow | null,
    game: Game,
    steamPath: string | null,
): WatchedGame | null {
    const winePrefix = ensureWinePrefix(store, game, steamPath)
    const gameDir = game.executablePath ? path.dirname(game.executablePath) : undefined
    const candidates = findAchievementFiles({ winePrefix, gameDir })
    const dirs = watchDirsFor(candidates)
    if (dirs.length === 0) return null

    const existing = candidates.map((c) => c.filePath).filter((f) => fs.existsSync(f))
    if (existing.length > 0) void seedBaseline(store, game.id, existing)

    const watchers: fs.FSWatcher[] = []
    for (const dir of dirs) {
        const dirWatchers = watchRecursive(dir, (fullPath) => {
            const base = path.basename(fullPath)
            if (!ACHIEVEMENT_FILENAMES.includes(base)) return
            scheduleProcessFile(store, win, game.id, fullPath)
        })
        watchers.push(...dirWatchers)
    }

    if (watchers.length === 0) return null
    console.log(`[Achievements] Watching ${dirs.length} location(s) for ${game.title}`)
    return { gameId: game.id, watchers }
}

/** Rebuilds watchers for every game that has somewhere worth watching. */
export function refreshAchievementWatchers(store: JsonStore, win: BrowserWindow | null) {
    try {
        stopAchievementWatchers()

        const steamPath = steamService.getStatus().steamPath
        const eligible = store.get('games').filter((g) => !g.steamAppId && g.metadataAppId)
        console.log(`[Achievements] Checking ${eligible.length} matched non-Steam game(s) for achievement files`)

        for (const game of eligible) {
            const entry = watchGame(store, win, game, steamPath)
            if (entry) watched.set(game.id, entry)
            else console.log(`[Achievements] No achievement files found for ${game.title}`)
        }

        console.log(`[Achievements] ✓ Watching ${watched.size} game(s)`)
    } catch (err) {
        console.error('[Achievements] Failed to start watchers:', err)
    }
}

export function stopAchievementWatchers() {
    for (const timer of debounceTimers.values()) clearTimeout(timer)
    debounceTimers.clear()
    for (const entry of watched.values()) {
        entry.watchers.forEach((w) => w.close())
    }
    watched.clear()
}
