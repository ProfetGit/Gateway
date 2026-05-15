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

    // 1. Sync local files first (Install status truth)
    steamService.initialize()
    steamService.syncWithStore(store)
    console.log('[Main] ✓ Local files synced')

    // 2. Fetch API Games
    const apiResult = await fetchOwnedGames(steamId)
    let apiGames: Array<{ appId: string; name: string; playtime: number; lastPlayed?: number }> = []

    if (apiResult.success) {
        apiGames = apiResult.games
    } else {
        console.warn('[Main] Steam API fetch failed:', apiResult.error)
        if (apiResult.games.length === 0) {
            // If API completely failed and we have no games, we can't do much more
            // But we might still have local claims to process
        }
    }

    // 3. Per-game fallback for stragglers — claims not in API, games with
    // missing names. With the new /actions/GetOwnedApps endpoint as primary,
    // this should hit ~0 games for typical syncs. Hard-capped to avoid Steam
    // Store API rate limits (200/5min) if something does fall through.
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
        if (stragglerIds.size > PER_GAME_FETCH_CAP) {
            console.warn('[Main] Capping per-game name fetches at', PER_GAME_FETCH_CAP, '(', stragglerIds.size - PER_GAME_FETCH_CAP, 'games left for background resolver)')
        } else {
            console.log('[Main] Per-game fallback for', idsToFetch.length, 'stragglers')
        }

        const details = await fetchSteamStoreDetails(idsToFetch)
        const detailsMap = new Map(details.map((d) => [String(d.appId), d]))

        for (const game of apiGames) {
            const detail = detailsMap.get(game.appId)
            if (detail?.name) game.name = detail.name
        }

        // Add local claims that weren't in the API list
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

    // 4. Update Store (Authoritative Sync)
    if (apiGames.length > 0) {
        const existingGames = store.get('games')

        // 1. Keep Non-Steam games (Manual adds)
        const finalGames = existingGames.filter(g => g.source !== 'steam')

        // 2. Identify existing Steam games to preserve config (favorites, custom covers, install status)
        const existingSteamMap = new Map(existingGames.filter(g => g.source === 'steam' && g.steamAppId).map(g => [g.steamAppId!, g]))

        for (const apiGame of apiGames) {
            const existing = existingSteamMap.get(apiGame.appId)

            if (existing) {
                // Update existing game details
                // Only update title if it's NOT a placeholder (or if it WAS a placeholder and we have a better name now)
                if (apiGame.name && (existing.title.startsWith('Game ') || existing.title.startsWith('Claimed Game') || !existing.title)) {
                    existing.title = apiGame.name
                }

                // Playtime: take the max of existing (from local VDF scan) and
                // incoming (from session/API). Never downgrade — the session
                // path returns 0 for any game not enriched by the community
                // games XML feed (privacy blocks the feed for many users).
                // Overwriting with 0 would erase real VDF-sourced playtime.
                existing.playtime = Math.max(existing.playtime ?? 0, apiGame.playtime ?? 0)

                // Last played: prefer the more recent timestamp from any source.
                if (apiGame.lastPlayed) {
                    const apiIso = new Date(apiGame.lastPlayed * 1000).toISOString()
                    if (!existing.lastPlayed || apiIso > existing.lastPlayed) {
                        existing.lastPlayed = apiIso
                    }
                }

                // Preserve local state (favorites, custom covers, installed)
                // We re-push the modified existing object to keep its ID and extra props
                finalGames.push(existing)
            } else {
                // Add new game
                finalGames.push({
                    id: uuidv4(),
                    title: apiGame.name,
                    steamAppId: apiGame.appId,
                    coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${apiGame.appId}/library_600x900_2x.jpg`,
                    isInstalled: false, // Default to false, steamService.syncWithStore handling will correct this if installed locally
                    isFavorite: false,
                    source: 'steam',
                    playtime: apiGame.playtime,
                    lastPlayed: apiGame.lastPlayed ? new Date(apiGame.lastPlayed * 1000).toISOString() : undefined,
                })
            }
        }

        // NOTE: Games that were in 'existingGames' but NOT in 'apiGames' (and are source='steam') 
        // vary: if they were excluded by filters, they are explicitly DROPPED here. 
        // This effectively "prunes" the OBS/Tools junk.

        store.set('games', finalGames)
        console.log('[Main] ✓ Sync complete. Total games:', finalGames.length)

        // Notify renderer (covers are mirrored async)
        win?.webContents.send('games-updated', finalGames)
        mirrorAllCovers(store, win)

        // Background-resolve any games STILL named "Game ${appId}" after bulk
        // resolution. These are appIds missing from Steam's GetAppList feed
        // (DLC/region-locked/recently-added games). Fetched one-at-a-time
        // with throttling — never blocks the sync return path.
        resolveStragglersInBackground(store, win)

        return { success: true, count: finalGames.length }
    }

    return { success: apiResult.success, count: 0 }
}

// ─── Background straggler resolver ──────────────────────────────────────────
//
// Games whose names are still "Game ${appId}" after bulk resolution get their
// names fetched one-by-one from Steam's appdetails endpoint. Steam rate-limits
// this at ~200 requests / 5min, so we throttle at one call per 1.5s and cap
// the queue at 100 games per sync. Failures are remembered for the rest of
// the process lifetime so re-syncs don't re-attempt them.

const stragglerFailedAppIds = new Set<string>()
let stragglerResolverRunning = false
const STRAGGLER_CAP = 100
const STRAGGLER_DELAY_MS = 1500

function resolveStragglersInBackground(store: JsonStore, win: BrowserWindow | null) {
    if (stragglerResolverRunning) return
    stragglerResolverRunning = true

    void (async () => {
        try {
            const games = store.get('games')
            const stragglers = games.filter(g =>
                g.source === 'steam' &&
                g.steamAppId &&
                g.title.startsWith('Game ') &&
                !stragglerFailedAppIds.has(g.steamAppId)
            ).slice(0, STRAGGLER_CAP)

            if (stragglers.length === 0) return
            console.log('[Main] Background-resolving', stragglers.length, 'straggler names...')

            let resolved = 0
            for (const game of stragglers) {
                try {
                    const url = `https://store.steampowered.com/api/appdetails?appids=${game.steamAppId}&filters=basic`
                    const res = await fetch(url, { headers: { Accept: 'application/json' } })

                    if (res.status === 429) {
                        console.warn('[Main] Hit rate limit on stragglers, stopping. Resolved', resolved, 'so far')
                        break
                    }
                    if (!res.ok) {
                        stragglerFailedAppIds.add(game.steamAppId!)
                        continue
                    }

                    const data = await res.json() as Record<string, { success: boolean; data?: { name?: string } }>
                    const entry = data[game.steamAppId!]
                    if (entry?.success && entry.data?.name) {
                        const current = store.get('games')
                        const updated = current.map(g =>
                            g.id === game.id ? { ...g, title: entry.data!.name! } : g
                        )
                        store.set('games', updated)
                        win?.webContents.send('games-updated', updated)
                        resolved++
                    } else {
                        // Steam responded but no name — likely delisted. Remember
                        // so we don't waste the rate limit on retries.
                        stragglerFailedAppIds.add(game.steamAppId!)
                    }
                } catch (err) {
                    console.warn('[Main] Straggler fetch failed for', game.steamAppId, err)
                    stragglerFailedAppIds.add(game.steamAppId!)
                }

                await new Promise(resolve => setTimeout(resolve, STRAGGLER_DELAY_MS))
            }

            console.log('[Main] ✓ Background straggler resolution done.', resolved, 'names resolved.')
        } catch (err) {
            console.error('[Main] Background straggler resolver crashed:', err)
        } finally {
            stragglerResolverRunning = false
        }
    })()
}


export function setupSyncHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    // ═══════════════════════════════════════════════════════════
    // Steam Authentication
    // ═══════════════════════════════════════════════════════════

    // Login with Steam - auto-syncs games after successful login
    ipcMain.handle('steam-login', async () => {
        console.log('[Main] steam-login IPC handler called')
        try {
            const authState = await loginWithSteam()

            if (authState.isLoggedIn && authState.user) {
                console.log('[Main] Login successful, performing unified sync...')
                await performSteamSync(store, authState.user.steamId, getMainWindow())
            }

            return authState
        } catch (error) {
            console.error('[Main] steam-login error:', error)
            throw error
        }
    })

    // Logout
    ipcMain.handle('steam-logout', async () => {
        await logout()
        return getAuthState()
    })

    // Get auth state
    ipcMain.handle('get-auth-state', () => {
        return getAuthState()
    })

    // Check if API key is configured
    ipcMain.handle('has-steam-api-key', () => {
        return hasApiKey()
    })

    // Fetch owned games via Steam API and sync to store
    ipcMain.handle('fetch-steam-games', async () => {
        const auth = getAuthState()
        if (!auth.isLoggedIn || !auth.user) {
            return { success: false, error: 'Not logged in', games: [] }
        }

        const result = await performSteamSync(store, auth.user.steamId, getMainWindow())

        // Return format expected by renderer for this specific call
        const games = store.get('games')
        return { success: result.success, games }
    })

    // Get Steam installation status
    ipcMain.handle('get-steam-status', () => {
        return steamService.getStatus()
    })

    // Clear all games and re-fetch from Steam API (fresh start)
    ipcMain.handle('clear-and-resync', async () => {
        console.log('[Main] clear-and-resync called')

        const auth = getAuthState()
        if (!auth.isLoggedIn || !auth.user) {
            return { success: false, error: 'Not logged in. Please login with Steam first.' }
        }

        // Explicitly clear first as requested by this specific action
        store.set('games', [])
        console.log('[Main] Cleared all games from store')

        // Reuse unified logic
        const result = await performSteamSync(store, auth.user.steamId, getMainWindow())

        const games = store.get('games')
        return {
            success: result.success,
            totalGames: games.length,
            installedGames: games.filter(g => g.isInstalled).length
        }
    })

    // Steam sync - generic handler
    ipcMain.handle('sync-steam', async () => {
        console.log('[Main] sync-steam IPC handler called')
        const auth = getAuthState()
        if (auth.isLoggedIn && auth.user) {
            await performSteamSync(store, auth.user.steamId, getMainWindow())
        } else {
            // Fallback for not logged in: just local sync
            steamService.initialize()
            const newGames = steamService.syncWithStore(store)
            mirrorAllCovers(store, getMainWindow())
            return newGames
        }
        return store.get('games')
    })

    // ═══════════════════════════════════════════════════════════
    // Achievements
    // ═══════════════════════════════════════════════════════════

    ipcMain.handle('get-achievements', async (_event, appId: string) => {
        console.log('[Main] get-achievements called for appId:', appId)
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

    // Open Steam store and track as pending claim
    ipcMain.handle('open-steam-store-claim', async (_event, appId: string) => {
        console.log('[Main] Opening Steam store for claim, appId:', appId)
        store.set('pendingClaimAppId', appId)
        await shell.openExternal(`steam://store/${appId}`)
    })

    // Check if a specific app is owned (Hybrid: API + Local Storage)
    ipcMain.handle('check-game-owned', async (_event, appId: string) => {
        // 1. Check local persistent store first
        const localClaims = store.get('claimedAppIds') || []
        if (localClaims.includes(appId)) {

            return { success: true, owned: true }
        }

        // 2. Check Steam API
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

        // If API says owned but not in local, maybe sync it? 
        // Not strictly necessary as API is truth, but good for offline.
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
        store.set('pendingClaimAppId', null) // Clear immediately

        const auth = getAuthState()
        if (!auth.isLoggedIn || !auth.user) {
            console.log('[Main] Not logged in, skipping claim check')
            return
        }

        // Small delay to allow Steam to register the claim
        await new Promise(resolve => setTimeout(resolve, 500))

        const result = await fetchOwnedGames(auth.user.steamId)
        let owned = false

        if (result.success) {
            owned = result.games.some(g => g.appId === appIdToCheck)
            console.log('[Main] Claim check result:', appIdToCheck, 'owned =', owned)
        }

        // HYBRID FALLBACK:
        // If API says NOT owned, but we just returned from a pending claim,
        // we assume the user claimed it (especially for F2P games API misses).
        if (!owned) {
            console.log('[Main] API failed to detect claim, assuming success (Hybrid)')
            owned = true // Optimistic assumption
        }

        if (owned) {
            // Persist to local claims store
            const currentClaims = store.get('claimedAppIds') || []
            if (!currentClaims.includes(appIdToCheck)) {
                store.set('claimedAppIds', [...currentClaims, appIdToCheck])
                console.log('[Main] Persisted claim locally:', appIdToCheck)
            }

            // Add game to library if not already there
            const games = store.get('games')
            const alreadyInLibrary = games.some(g => g.steamAppId === appIdToCheck)

            if (!alreadyInLibrary) {
                console.log('[Main] Adding claimed game to library:', appIdToCheck)

                // Fetch game details from Steam Store API
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

                    // Notify renderer of updated games list
                    if (win) {
                        win.webContents.send('games-updated', updatedGames)
                    }
                } else {
                    // Fallback: add placeholder if store API fails
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

                    if (win) {
                        win.webContents.send('games-updated', updatedGames)
                    }
                }
            }

            // Notify renderer of claim status
            if (win) {
                win.webContents.send('game-claimed', { appId: appIdToCheck, owned: true })
            }
        }
    }
}
