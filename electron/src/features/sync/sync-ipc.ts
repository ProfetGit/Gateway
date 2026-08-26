import { ipcMain, shell, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { JsonStore } from '../../shared/store'
import { mirrorAllCovers } from '../../shared/utils'
import { fetchSteamStoreDetails } from '../steam/steam-api'
import { steamService } from '../steam/steam-service'
import {
    loginWithSteam,
    logout,
    getAuthState,
    fetchOwnedGames,
    hasApiKey,
    fetchPlayerAchievements
} from '../../../steamAuth'
import { normalizeAppType } from '../../shared/normalize-app-type'
import { performHeroicSync } from '../heroic/heroic-sync'
import { performLutrisSync } from '../lutris/lutris-sync'
import { Game } from '../../shared/types'

// ═══════════════════════════════════════════════════════════
// UI & Sync Logic Helper
// ═══════════════════════════════════════════════════════════

/**
 * Unified logic to sync Steam games:
 * 1. Syncs local file status (installed games).
 * 2. Fetches owned games from Steam API.
 * 3. Merges in "Local Claims" (games claimed via app but missing from API, e.g. F2P).
 * 4. Updates store while preserving existing local data (favorites, etc).
 */
export async function performSteamSync(store: JsonStore, steamId: string, win: BrowserWindow | null) {
    console.log('[Main] performSteamSync started')

    steamService.initialize()
    steamService.syncWithStore(store)
    console.log('[Main] ✓ Local files synced')

    const apiResult = await fetchOwnedGames(steamId)
    let apiGames: Array<{ appId: string; name: string; playtime: number; lastPlayed?: number }> = []

    if (apiResult.success) {
        apiGames = apiResult.games
    } else {
        console.warn('[Main] Steam API fetch failed:', apiResult.error)
    }

    const PER_GAME_FETCH_CAP = 10
    const localClaims = store.get('claimedAppIds') || []
    const ownedAppIds = new Set(apiGames.map(g => g.appId))
    const stragglerIds = new Set<string>()

    for (const claimId of localClaims) {
        if (!ownedAppIds.has(claimId)) stragglerIds.add(claimId)
    }
    for (const game of apiGames) {
        if (!game.name || game.name === `Game ${game.appId}`) stragglerIds.add(game.appId)
    }

    if (stragglerIds.size > 0) {
        const idsToFetch = Array.from(stragglerIds).slice(0, PER_GAME_FETCH_CAP)
        const details = await fetchSteamStoreDetails(idsToFetch)
        const detailsMap = new Map(details.map((d) => [String(d.appId), d]))

        for (const game of apiGames) {
            const detail = detailsMap.get(game.appId)
            if (detail?.name) game.name = detail.name
        }

        const fetchedIds = new Set(details.map((g) => String(g.appId)))
        for (const id of idsToFetch) {
            if (localClaims.includes(id) && !ownedAppIds.has(id)) {
                if (fetchedIds.has(id)) {
                    const detail = detailsMap.get(id)
                    apiGames.push({ appId: id, name: detail?.name ?? `Game ${id}`, playtime: 0, lastPlayed: undefined })
                } else {
                    apiGames.push({ appId: id, name: `Claimed Game (${id})`, playtime: 0, lastPlayed: undefined })
                }
            }
        }
    }

    if (apiGames.length > 0) {
        const existingGames = store.get('games')
        const finalGames = existingGames.filter(g => g.source !== 'steam')
        const existingSteamMap = new Map(existingGames.filter(g => g.source === 'steam' && g.steamAppId).map(g => [g.steamAppId!, g]))

        for (const apiGame of apiGames) {
            const existing = existingSteamMap.get(apiGame.appId)

            if (existing) {
                if (apiGame.name && (existing.title.startsWith('Game ') || existing.title.startsWith('Claimed Game') || !existing.title)) {
                    existing.title = apiGame.name
                }
                existing.playtime = Math.max(existing.playtime ?? 0, apiGame.playtime ?? 0)
                if (apiGame.lastPlayed) {
                    const apiIso = new Date(apiGame.lastPlayed * 1000).toISOString()
                    if (!existing.lastPlayed || apiIso > existing.lastPlayed) {
                        existing.lastPlayed = apiIso
                    }
                }
                finalGames.push(existing)
            } else {
                finalGames.push({
                    id: uuidv4(),
                    title: apiGame.name,
                    steamAppId: apiGame.appId,
                    coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${apiGame.appId}/library_600x900_2x.jpg`,
                    isInstalled: false,
                    isFavorite: false,
                    source: 'steam',
                    playtime: apiGame.playtime,
                    lastPlayed: apiGame.lastPlayed ? new Date(apiGame.lastPlayed * 1000).toISOString() : undefined,
                })
            }
        }

        store.set('games', finalGames)
        console.log('[Main] ✓ Sync complete. Total games:', finalGames.length)

        win?.webContents.send('games-updated', finalGames)
        mirrorAllCovers(store, win)
        resolveGamesInBackground(store, win)

        return { success: true, count: finalGames.length }
    }

    return { success: apiResult.success, count: 0 }
}

// ─── Unified background resolver ─────────────────────────────────────────────
//
// Fixes placeholder names ("Game ${appId}") AND missing app types
// (game/dlc/application/etc.) in one API call per game.
//
// Steam rate limit: ~200 req / 5min. At 1500ms/req we stay safely under.

const resolverAttemptedThisSession = new Set<string>()
const permanentlyFailed = new Set<string>()
let backgroundResolverRunning = false
let syncAllInFlight = false
const RESOLVER_DELAY_MS = 1500

function resolveGamesInBackground(store: JsonStore, win: BrowserWindow | null) {
    if (backgroundResolverRunning) return
    backgroundResolverRunning = true

    void (async () => {
        try {
            const games = store.get('games')
            const toResolve = games.filter(g =>
                g.source === 'steam' &&
                g.steamAppId &&
                !permanentlyFailed.has(g.steamAppId!) &&
                !resolverAttemptedThisSession.has(g.steamAppId!) &&
                (g.title.startsWith('Game ') || !g.appType)
            )

            if (toResolve.length === 0) return
            console.log('[Main] Background resolver: processing', toResolve.length, 'games (name/type)')

            let updatedCount = 0
            for (const game of toResolve) {
                resolverAttemptedThisSession.add(game.steamAppId!)
                try {
                    const url = `https://store.steampowered.com/api/appdetails?appids=${game.steamAppId}&filters=basic`
                    const res = await fetch(url, { headers: { Accept: 'application/json' } })

                    if (res.status === 429) {
                        console.warn('[Main] Rate-limited in background resolver, stopping at', updatedCount, 'updated')
                        break
                    }
                    if (!res.ok) continue

                    const data = await res.json() as Record<string, { success: boolean; data?: { name?: string; type?: string } }>
                    const entry = data[game.steamAppId!]

                    if (!entry?.success || !entry.data) {
                        permanentlyFailed.add(game.steamAppId!)
                        continue
                    }

                    const patch: Partial<Game> = {}
                    if (entry.data.name && game.title.startsWith('Game ')) {
                        patch.title = entry.data.name
                    }
                    if (entry.data.type && !game.appType) {
                        patch.appType = normalizeAppType(entry.data.type)
                    }

                    if (Object.keys(patch).length === 0) continue

                    const current = store.get('games')
                    const next = current.map(g => g.id === game.id ? { ...g, ...patch } : g)
                    store.set('games', next)
                    updatedCount++

                    if (patch.title || (patch.appType && patch.appType !== 'game')) {
                        win?.webContents.send('games-updated', next)
                    }
                } catch (err) {
                    console.warn('[Main] Background resolver failed for', game.steamAppId, err)
                }

                await new Promise(r => setTimeout(r, RESOLVER_DELAY_MS))
            }

            console.log('[Main] ✓ Background resolver done.', updatedCount, 'games updated.')
        } catch (err) {
            console.error('[Main] Background resolver crashed:', err)
        } finally {
            backgroundResolverRunning = false
        }
    })()
}

export function setupSyncHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    // ═══════════════════════════════════════════════════════════
    // Steam Authentication
    // ═══════════════════════════════════════════════════════════

    ipcMain.handle('steam_login', async () => {
        console.log('[Main] steam_login IPC handler called')
        const authState = await loginWithSteam()
        if (authState.isLoggedIn && authState.user) {
            console.log('[Main] Login successful, performing unified sync...')
            await performSteamSync(store, authState.user.steamId, getMainWindow())
        }
        return authState
    })

    ipcMain.handle('steam_logout', async () => {
        logout()
        return getAuthState()
    })

    ipcMain.handle('get_auth_state', () => {
        return getAuthState()
    })

    ipcMain.handle('has_steam_api_key', () => {
        return hasApiKey()
    })

    ipcMain.handle('fetch_steam_games', async () => {
        const auth = getAuthState()
        if (!auth.isLoggedIn || !auth.user) {
            return { success: false, error: 'Not logged in', games: [] }
        }

        const result = await performSteamSync(store, auth.user.steamId, getMainWindow())
        const games = store.get('games')
        return { success: result.success, games }
    })

    ipcMain.handle('get_steam_status', () => {
        return steamService.getStatus()
    })

    ipcMain.handle('clear_and_resync', async () => {
        console.log('[Main] clear_and_resync called')

        const auth = getAuthState()
        if (!auth.isLoggedIn || !auth.user) {
            return { success: false, error: 'Not logged in. Please login with Steam first.' }
        }

        store.set('games', [])
        console.log('[Main] Cleared all games from store')

        const result = await performSteamSync(store, auth.user.steamId, getMainWindow())
        // The clear wipes every source, so rebuild all of them — not just Steam.
        await performHeroicSync(store)
        await performLutrisSync(store)

        const games = store.get('games')
        return {
            success: result.success,
            totalGames: games.length,
            installedGames: games.filter(g => g.isInstalled).length
        }
    })

    ipcMain.handle('sync_steam', async () => {
        console.log('[Main] sync_steam IPC handler called')
        const auth = getAuthState()
        if (auth.isLoggedIn && auth.user) {
            await performSteamSync(store, auth.user.steamId, getMainWindow())
        } else {
            steamService.initialize()
            steamService.syncWithStore(store)
            mirrorAllCovers(store, getMainWindow())
        }
        return store.get('games')
    })

    // Refresh every source. Sequential and guarded on purpose: all three syncs
    // read-modify-write store.get('games'), and performSteamSync additionally
    // kicks off mirrorAllCovers and resolveGamesInBackground on their own
    // timers. Running them concurrently loses rows to last-write-wins.
    ipcMain.handle('sync_all_sources', async () => {
        if (syncAllInFlight) {
            console.log('[Main] sync_all_sources already running, ignoring')
            return store.get('games')
        }
        syncAllInFlight = true
        try {
            const auth = getAuthState()
            if (auth.isLoggedIn && auth.user) {
                await performSteamSync(store, auth.user.steamId, null)
            } else {
                steamService.initialize()
                steamService.syncWithStore(store)
            }
            await performHeroicSync(store)
            await performLutrisSync(store)

            // One emit, once everything has settled.
            const games = store.get('games')
            getMainWindow()?.webContents.send('games-updated', games)
            void mirrorAllCovers(store, getMainWindow())
            return games
        } finally {
            syncAllInFlight = false
        }
    })

    // ═══════════════════════════════════════════════════════════
    // Achievements
    // ═══════════════════════════════════════════════════════════

    ipcMain.handle('get_achievements', async (_event, { appId }: { appId: string }) => {
        const auth = getAuthState()
        if (!auth.isLoggedIn || !auth.user) {
            return {
                success: false,
                achievements: [],
                totalAchievements: 0,
                unlockedCount: 0,
                error: 'Not logged in. Please login with Steam first.',
                errorCode: 'NO_API_KEY' as const,
            }
        }
        return fetchPlayerAchievements(auth.user.steamId, appId)
    })

    // ═══════════════════════════════════════════════════════════
    // Claim Detection & Openers
    // ═══════════════════════════════════════════════════════════

    ipcMain.handle('open_steam_store_claim', async (_event, { appId }: { appId: string }) => {
        console.log('[Main] Opening Steam store for claim, appId:', appId)
        store.set('pendingClaimAppId', appId)
        await shell.openExternal(`steam://store/${appId}`)
    })

    ipcMain.handle('check_game_owned', async (_event, { appId }: { appId: string }) => {
        const localClaims = store.get('claimedAppIds') || []
        if (localClaims.includes(appId)) {
            return { success: true, owned: true }
        }

        const auth = getAuthState()
        if (!auth.isLoggedIn || !auth.user) {
            return { success: false, owned: false }
        }

        const result = await fetchOwnedGames(auth.user.steamId)
        if (!result.success) {
            return { success: false, owned: false }
        }

        const owned = result.games.some(g => g.appId === appId)
        console.log('[Main] Check game owned (API):', appId, '=', owned)

        if (owned) {
            const updatedClaims = [...new Set([...localClaims, appId])]
            store.set('claimedAppIds', updatedClaims)
        }

        return { success: true, owned }
    })
}

// Global focus handler wrapper
export async function checkPendingClaims(store: JsonStore, win: BrowserWindow | null) {
    const pendingClaimAppId = store.get('pendingClaimAppId')
    if (pendingClaimAppId) {
        console.log('[Main] App focused, checking pending claim:', pendingClaimAppId)
        const appIdToCheck = pendingClaimAppId
        store.set('pendingClaimAppId', null)

        const auth = getAuthState()
        if (!auth.isLoggedIn || !auth.user) {
            console.log('[Main] Not logged in, skipping claim check')
            return
        }

        await new Promise(resolve => setTimeout(resolve, 500))

        const result = await fetchOwnedGames(auth.user.steamId)
        let owned = false

        if (result.success) {
            owned = result.games.some(g => g.appId === appIdToCheck)
            console.log('[Main] Claim check result:', appIdToCheck, 'owned =', owned)
        }

        // HYBRID FALLBACK: assume claimed even if API missed it (e.g. F2P lag).
        if (!owned) {
            console.log('[Main] API failed to detect claim, assuming success (Hybrid)')
            owned = true
        }

        if (owned) {
            const currentClaims = store.get('claimedAppIds') || []
            if (!currentClaims.includes(appIdToCheck)) {
                store.set('claimedAppIds', [...currentClaims, appIdToCheck])
                console.log('[Main] Persisted claim locally:', appIdToCheck)
            }

            const games = store.get('games')
            const alreadyInLibrary = games.some(g => g.steamAppId === appIdToCheck)

            if (!alreadyInLibrary) {
                console.log('[Main] Adding claimed game to library:', appIdToCheck)
                const gameDetails = await fetchSteamStoreDetails([appIdToCheck])

                if (gameDetails.length > 0) {
                    const detail = gameDetails[0]
                    const newGame: Game = {
                        id: uuidv4(),
                        title: detail.name,
                        steamAppId: appIdToCheck,
                        coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${appIdToCheck}/library_600x900_2x.jpg`,
                        isInstalled: false,
                        isFavorite: false,
                        source: 'steam',
                        playtime: 0,
                        lastPlayed: undefined,
                    }

                    const updatedGames = [...games, newGame]
                    store.set('games', updatedGames)
                    console.log('[Main] ✓ Added', detail.name, 'to library')
                    win?.webContents.send('games-updated', updatedGames)
                } else {
                    const placeholderGame: Game = {
                        id: uuidv4(),
                        title: `Game ${appIdToCheck}`,
                        steamAppId: appIdToCheck,
                        coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${appIdToCheck}/library_600x900_2x.jpg`,
                        isInstalled: false,
                        isFavorite: false,
                        source: 'steam',
                        playtime: 0,
                    }

                    const updatedGames = [...games, placeholderGame]
                    store.set('games', updatedGames)
                    console.log('[Main] Added placeholder for', appIdToCheck)
                    win?.webContents.send('games-updated', updatedGames)
                }
            }

            win?.webContents.send('game-claimed', { appId: appIdToCheck, owned: true })
        }
    }
}
