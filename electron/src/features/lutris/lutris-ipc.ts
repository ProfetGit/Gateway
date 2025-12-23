import { ipcMain, shell, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { JsonStore } from '../../shared/store'
import { Game, LutrisGame } from '../../shared/types'
import {
    getLutrisStatus,
    scanLutrisGames,
    getLutrisCoverPath,
    isSteamRunner,
    getLutrisGameSteamAppId,
    fetchLutrisGameArt,
} from './lutris-scanner'

// ═══════════════════════════════════════════════════════════
// Convert Lutris game to Gateway Game format
// ═══════════════════════════════════════════════════════════

function convertLutrisGame(lutrisGame: LutrisGame): Omit<Game, 'id'> {
    // Get local cover art path
    const coverPath = getLutrisCoverPath(lutrisGame.slug)
    const steamAppId = getLutrisGameSteamAppId(lutrisGame)

    let heroImageUrl: string | undefined
    let logoImageUrl: string | undefined
    let coverUrl: string | undefined

    if (steamAppId) {
        heroImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/library_hero.jpg`
        logoImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/logo.png`
        coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${steamAppId}/library_600x900.jpg`
    }

    return {
        title: lutrisGame.name,
        source: 'lutris',
        lutrisId: lutrisGame.id,
        lutrisSlug: lutrisGame.slug,
        steamAppId: steamAppId || undefined,
        isInstalled: lutrisGame.installed === 1,
        isFavorite: false,
        playtime: lutrisGame.playtime ? Math.round(lutrisGame.playtime * 60) : undefined, // Lutris stores hours, convert to minutes
        lastPlayed: lutrisGame.lastplayed
            ? new Date(lutrisGame.lastplayed * 1000).toISOString()
            : undefined,
        localCoverPath: coverPath || undefined,
        heroImageUrl,
        logoImageUrl,
        coverUrl,
    }
}

async function enrichLutrisGames(games: Game[], store: JsonStore) {
    const gamesNeedingArt = games.filter(g =>
        g.source === 'lutris' &&
        !g.steamAppId &&
        (!g.heroImageUrl || !g.coverUrl)
    )

    if (gamesNeedingArt.length === 0) return

    console.log(`[Lutris] Fetching art for ${gamesNeedingArt.length} games...`)
    const CONCURRENCY = 5
    const queue = [...gamesNeedingArt]
    let updatedCount = 0

    const workers = Array(CONCURRENCY).fill(null).map(async () => {
        while (queue.length > 0) {
            const game = queue.shift()!
            if (!game.lutrisSlug) continue

            const art = await fetchLutrisGameArt(game.lutrisSlug)
            if (art) {
                let changed = false

                // If we found a Steam AppID during fetch, upgrade to full Steam assets
                if (art.steamAppId && !game.steamAppId) {
                    game.steamAppId = art.steamAppId
                    game.heroImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${art.steamAppId}/library_hero.jpg`
                    game.logoImageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${art.steamAppId}/logo.png`
                    game.coverUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${art.steamAppId}/library_600x900.jpg`
                    changed = true
                } else {
                    // Standard Lutris fallback
                    if (art.coverUrl && !game.coverUrl) {
                        game.coverUrl = art.coverUrl
                        changed = true
                    }
                    if (art.bannerUrl && !game.heroImageUrl) {
                        game.heroImageUrl = art.bannerUrl
                        changed = true
                    }
                }

                if (changed) updatedCount++
            }
        }
    })

    await Promise.all(workers)

    if (updatedCount > 0) {
        console.log(`[Lutris] Updated art for ${updatedCount} games`)
        store.set('games', games)
    }
}

// ═══════════════════════════════════════════════════════════
// Sync Lutris games into store
// ═══════════════════════════════════════════════════════════

export async function performLutrisSync(
    store: JsonStore,
    existingSteamAppIds: Set<string>
): Promise<Game[]> {
    const lutrisGames = await scanLutrisGames()
    const currentGames = store.get('games')

    if (lutrisGames.length === 0) {
        console.log('[Lutris] No games found in Lutris database')
        return currentGames
    }

    // Filter out Steam games that are already in our library (avoid duplicates)
    const nonSteamLutrisGames = lutrisGames.filter(lg => {
        if (!isSteamRunner(lg)) return true

        const steamAppId = getLutrisGameSteamAppId(lg)
        if (steamAppId && existingSteamAppIds.has(steamAppId)) {
            return false // Skip - already have this Steam game
        }
        return true
    })

    console.log(`[Lutris] Found ${lutrisGames.length} games, ${nonSteamLutrisGames.length} after filtering Steam duplicates`)

    // Build a map of existing Lutris games by lutrisId for efficient lookup
    const existingLutrisMap = new Map<number, Game>()
    for (const game of currentGames) {
        if (game.lutrisId !== undefined) {
            existingLutrisMap.set(game.lutrisId, game)
        }
    }

    const mergedGames: Game[] = []
    const processedLutrisIds = new Set<number>()

    // Add/update Lutris games
    for (const lg of nonSteamLutrisGames) {
        processedLutrisIds.add(lg.id)
        const existing = existingLutrisMap.get(lg.id)
        const converted = convertLutrisGame(lg)

        if (existing) {
            // Update existing game, preserve user-set fields
            mergedGames.push({
                ...existing,
                ...converted,
                isFavorite: existing.isFavorite, // Preserve
                notes: existing.notes, // Preserve
            })
        } else {
            // New game
            mergedGames.push({
                ...converted,
                id: uuidv4(),
            })
        }
    }

    // Keep non-Lutris games and Lutris games that still exist
    for (const game of currentGames) {
        if (game.source !== 'lutris') {
            // Keep all non-Lutris games
            if (!mergedGames.some(g => g.id === game.id)) {
                mergedGames.push(game)
            }
        } else if (game.lutrisId !== undefined && !processedLutrisIds.has(game.lutrisId)) {
            // Lutris game no longer exists - skip it (removed from Lutris)
        }
    }

    store.set('games', mergedGames)

    // Enrich with remote art (background process, but await it so initial sync is complete)
    // We can make this non-blocking if it's too slow, but for now we wait to ensure UI updates seamlessly
    await enrichLutrisGames(mergedGames, store)

    console.log(`[Lutris] ✓ Sync complete. Total games: ${mergedGames.length}`)
    return mergedGames
}

// ═══════════════════════════════════════════════════════════
// IPC Handlers
// ═══════════════════════════════════════════════════════════

export function setupLutrisHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    // Get Lutris installation status
    ipcMain.handle('get-lutris-status', async () => {
        try {
            return await getLutrisStatus()
        } catch (error) {
            console.error('[Lutris] Failed to get status:', error)
            return { installed: false, version: null, dataPath: null, gamesCount: 0 }
        }
    })

    // Sync Lutris games
    ipcMain.handle('sync-lutris', async () => {
        try {
            // Build set of existing Steam app IDs to avoid duplicates
            const currentGames = store.get('games')
            const steamAppIds = new Set<string>()
            for (const game of currentGames) {
                if (game.steamAppId) {
                    steamAppIds.add(game.steamAppId)
                }
            }

            const games = await performLutrisSync(store, steamAppIds)

            // Notify renderer of update
            const win = getMainWindow()
            if (win) {
                win.webContents.send('games-updated', games)
            }

            return games
        } catch (error) {
            console.error('[Lutris] Sync failed:', error)
            // Return current games instead of failing
            return store.get('games')
        }
    })

    // Launch Lutris game
    ipcMain.handle('launch-lutris-game', async (_event, lutrisId: number) => {
        try {
            await shell.openExternal(`lutris:rungameid/${lutrisId}`)
            return { success: true }
        } catch (error) {
            console.error('[Lutris] Failed to launch game:', error)
            return { success: false, error: String(error) }
        }
    })
}
