// ═══════════════════════════════════════════════════════════
// Steam Authentication
// ═══════════════════════════════════════════════════════════
//
// Primary path: embedded BrowserWindow + persistent session cookies.
//   - Login: opens steamSession.loginWithBrowser()
//   - Owned games / achievements: fetched via session cookies, no API key
//
// Fallback path: Steam Web Developer API Key.
//   - Used when the session is absent, expired, or the call fails
//   - Required for users with strictly-private profiles who don't want to log
//     in through the embedded browser
//
// This mirrors Playnite's auth model.

import {
    loginWithBrowser,
    resolveCurrentUser,
    validateSession,
    clearSession,
    SteamSessionUser,
} from './steamSession'
import {
    fetchOwnedGamesViaSession,
    fetchAchievementsViaSession,
} from './src/features/steam/steam-session-api'

// ─── Module state ───────────────────────────────────────────

let steamApiKey: string | null = null

interface AuthStore {
    get: (key: 'steamAuth') => AuthState | undefined
    set: (key: 'steamAuth', value: AuthState) => void
}

let authStore: AuthStore | null = null

interface SteamUser {
    steamId: string
    username: string
    avatarUrl: string
    profileUrl: string
}

interface AuthState {
    isLoggedIn: boolean
    user: SteamUser | null
}

let authState: AuthState = {
    isLoggedIn: false,
    user: null,
}

// ─── Init / lifecycle ───────────────────────────────────────

export function initAuth(store: AuthStore): void {
    authStore = store
    const savedAuth = store.get('steamAuth')
    if (savedAuth && savedAuth.isLoggedIn && savedAuth.user) {
        authState = savedAuth
        console.log('[SteamAuth] Restored cached auth state for:', savedAuth.user.username)
    }
}

/**
 * Re-validate session at startup. If the persisted cookies are still valid,
 * refresh the user record from Steam. If not, clear the auth state.
 * Called once from main.ts after initAuth.
 */
export async function refreshSessionOnStartup(): Promise<void> {
    if (!authState.isLoggedIn) return
    const result = await validateSession()
    if (!result.valid) {
        console.log('[SteamAuth] Cached session is no longer valid — clearing auth state')
        authState = { isLoggedIn: false, user: null }
        saveAuthState()
        return
    }
    // Optionally refresh user data (avatar may have changed)
    if (result.steamId) {
        const fresh = await resolveCurrentUser(result.steamId)
        authState = { isLoggedIn: true, user: fresh }
        saveAuthState()
    }
}

export function setSteamApiKey(key: string): void {
    steamApiKey = key && key.trim() ? key.trim() : null
    if (steamApiKey) {
        console.log('[SteamAuth] API key configured (fallback path enabled)')
    } else {
        console.log('[SteamAuth] API key cleared')
    }
}

export function getAuthState(): AuthState {
    return authState
}

export function hasApiKey(): boolean {
    return !!steamApiKey
}

function saveAuthState(): void {
    if (authStore) authStore.set('steamAuth', authState)
}

// ─── Login / Logout ─────────────────────────────────────────

export async function loginWithSteam(): Promise<AuthState> {
    console.log('[SteamAuth] Starting embedded-browser login...')
    try {
        const user: SteamSessionUser = await loginWithBrowser()
        authState = { isLoggedIn: true, user }
        saveAuthState()
        console.log('[SteamAuth] ✓ Logged in as:', user.username)
        return authState
    } catch (err) {
        console.error('[SteamAuth] Login failed:', err)
        throw err
    }
}

export async function logout(): Promise<void> {
    await clearSession()
    authState = { isLoggedIn: false, user: null }
    saveAuthState()
    console.log('[SteamAuth] Logged out + session cleared')
}

// ─── Owned games (session → API key fallback) ───────────────

export interface FetchGamesResult {
    success: boolean
    games: Array<{ appId: string; name: string; playtime: number; lastPlayed?: number }>
    error?: string
    errorCode?: 'NO_API_KEY' | 'PROFILE_PRIVATE' | 'API_ERROR' | 'NETWORK_ERROR' | 'RATE_LIMITED' | 'NO_AUTH'
}

export async function fetchOwnedGames(steamId: string): Promise<FetchGamesResult> {
    console.log('[SteamAuth] fetchOwnedGames — trying session path first')

    // Try session path first
    const sessionResult = await fetchOwnedGamesViaSession(steamId)
    if (sessionResult.success && sessionResult.games.length > 0) {
        console.log('[SteamAuth] ✓ Session path returned', sessionResult.games.length, 'games')
        return { success: true, games: sessionResult.games }
    }
    console.log('[SteamAuth] Session path unavailable:', sessionResult.error, '— falling back to API key')

    // Fallback: Steam Web API key
    if (!steamApiKey) {
        return {
            success: false,
            games: [],
            error: 'No active Steam session and no Web API key configured. Sign in to Steam, or add an API key in Settings.',
            errorCode: 'NO_AUTH',
        }
    }
    return fetchOwnedGamesViaApiKey(steamId)
}

async function fetchOwnedGamesViaApiKey(steamId: string): Promise<FetchGamesResult> {
    try {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`
        const response = await fetch(url)

        if (!response.ok) {
            if (response.status === 401) return apiKeyError('Invalid Steam API key', 'API_ERROR')
            if (response.status === 403) return apiKeyError('Access forbidden. Check API key permissions.', 'API_ERROR')
            if (response.status === 429) return apiKeyError('Steam API rate limit exceeded. Try again later.', 'RATE_LIMITED')
            if (response.status >= 500) return apiKeyError('Steam servers are currently unavailable.', 'API_ERROR')
            return apiKeyError(`Steam API error: ${response.status} ${response.statusText}`, 'API_ERROR')
        }

        const data = await response.json()

        if (data?.response?.games && Array.isArray(data.response.games)) {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const games = data.response.games.map((game: any) => ({
                appId: String(game.appid),
                name: game.name || `Game ${game.appid}`,
                playtime: game.playtime_forever || 0,
                lastPlayed: game.rtime_last_played || undefined,
            }))

            const UNWANTED_KEYWORDS = [
                'Dedicated Server', 'SDK', 'Redistributable', 'Shared Resources',
                'Test Server', 'Beta', 'Demo', 'Trial', 'Prototype', 'Soundtrack',
                'Artbook', 'Benchmark', 'Editor', 'Server', 'Client', 'macOS',
                'Linux', 'Windows', 'Software', 'Application',
            ]
            const UNWANTED_APP_NAMES = [
                'OBS Studio', 'Wallpaper Engine', 'Sounpad', 'ShareX', 'Blender',
                'Spacewar', 'SteamCMD', 'Tabletop Simulator Dedicated Server',
                'Source SDK Base 2013 Singleplayer', 'Source SDK Base 2013 Multiplayer',
                'Source SDK Base 2007', 'Source SDK Base 2006', 'Valve Hammer Editor',
                'FaceRig', 'Aseprite', 'Adobe Substance 3D Painter', '3DMark', 'PCMark 10',
                'Cinebench', 'RPG Maker MV', 'RPG Maker MZ', 'Pixel Game Maker MV',
                'GameMaker Studio 2', 'Vorpx', 'RetroArch',
            ]

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filtered = games.filter((g: any) => {
                const name = g.name || ''
                if (name === 'Steamworks Common Redistributables') return false
                if (name === 'SteamVR') return false
                if (UNWANTED_APP_NAMES.includes(name)) return false
                return !UNWANTED_KEYWORDS.some((kw) => name.includes(kw))
            })

            return filtered.length > 0
                ? { success: true, games: filtered }
                : { success: true, games: [], error: 'No games found in library' }
        }

        if (data?.response && Object.keys(data.response).length === 0) {
            return apiKeyError(
                'Steam profile is private. Either set Profile + Game details to Public, or sign in via the Setup wizard.',
                'PROFILE_PRIVATE'
            )
        }
        return apiKeyError('Unexpected response from Steam API', 'API_ERROR')
    } catch (err) {
        return apiKeyError(
            `Network error: ${err instanceof Error ? err.message : 'Unknown'}`,
            'NETWORK_ERROR'
        )
    }
}

function apiKeyError(error: string, errorCode: FetchGamesResult['errorCode']): FetchGamesResult {
    return { success: false, games: [], error, errorCode }
}

// ─── Achievements (session → API key fallback) ──────────────

export interface Achievement {
    apiname: string
    name: string
    description: string
    achieved: boolean
    unlocktime: number
    icon: string
    icongray: string
}

export interface FetchAchievementsResult {
    success: boolean
    achievements: Achievement[]
    totalAchievements: number
    unlockedCount: number
    gameName?: string
    error?: string
    errorCode?: 'NO_API_KEY' | 'PROFILE_PRIVATE' | 'NO_ACHIEVEMENTS' | 'API_ERROR' | 'NETWORK_ERROR' | 'NO_AUTH'
}

export async function fetchPlayerAchievements(
    steamId: string,
    appId: string
): Promise<FetchAchievementsResult> {
    // Try session-based community XML feed first.
    const sessionResult = await fetchAchievementsViaSession(steamId, appId)
    // Treat NO_ACHIEVEMENTS as a definitive answer — don't fall back, the game just has none.
    if (sessionResult.success || sessionResult.errorCode === 'NO_ACHIEVEMENTS') {
        return sessionResult as FetchAchievementsResult
    }

    // Session failed for an auth reason → try API key
    if (steamApiKey) {
        return fetchAchievementsViaApiKey(steamId, appId)
    }
    return {
        success: false,
        achievements: [],
        totalAchievements: 0,
        unlockedCount: 0,
        error: sessionResult.error ?? 'Achievement data unavailable',
        errorCode: sessionResult.errorCode === 'PROFILE_PRIVATE' ? 'PROFILE_PRIVATE' : 'NO_AUTH',
    }
}

async function fetchAchievementsViaApiKey(
    steamId: string,
    appId: string
): Promise<FetchAchievementsResult> {
    try {
        const [playerResponse, schemaResponse] = await Promise.all([
            fetch(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${steamApiKey}&steamid=${steamId}&appid=${appId}&l=english`),
            fetch(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${steamApiKey}&appid=${appId}&l=english`),
        ])

        if (!playerResponse.ok) {
            if (playerResponse.status === 403) {
                return {
                    success: false,
                    achievements: [],
                    totalAchievements: 0,
                    unlockedCount: 0,
                    error: 'Profile or game details are private',
                    errorCode: 'PROFILE_PRIVATE',
                }
            }
            return {
                success: false,
                achievements: [],
                totalAchievements: 0,
                unlockedCount: 0,
                error: `Steam API error: ${playerResponse.status}`,
                errorCode: 'API_ERROR',
            }
        }

        const playerData = await playerResponse.json()
        const schemaData = await schemaResponse.json()

        if (!playerData?.playerstats?.achievements) {
            if (playerData?.playerstats?.error) {
                return {
                    success: false,
                    achievements: [],
                    totalAchievements: 0,
                    unlockedCount: 0,
                    error: playerData.playerstats.error,
                    errorCode: playerData.playerstats.error.includes('Private') ? 'PROFILE_PRIVATE' : 'API_ERROR',
                }
            }
            return {
                success: true,
                achievements: [],
                totalAchievements: 0,
                unlockedCount: 0,
                gameName: playerData?.playerstats?.gameName,
                errorCode: 'NO_ACHIEVEMENTS',
            }
        }

        const schemaMap = new Map<string, { name: string; description: string; icon: string; icongray: string }>()
        if (schemaData?.game?.availableGameStats?.achievements) {
            for (const ach of schemaData.game.availableGameStats.achievements) {
                schemaMap.set(ach.name, {
                    name: ach.displayName || ach.name,
                    description: ach.description || '',
                    icon: ach.icon || '',
                    icongray: ach.icongray || '',
                })
            }
        }

        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const achievements: Achievement[] = playerData.playerstats.achievements.map((ach: any) => {
            const schema = schemaMap.get(ach.apiname) || { name: ach.apiname, description: '', icon: '', icongray: '' }
            return {
                apiname: ach.apiname,
                name: schema.name,
                description: ach.description || schema.description,
                achieved: ach.achieved === 1,
                unlocktime: ach.unlocktime || 0,
                icon: schema.icon,
                icongray: schema.icongray,
            }
        })

        achievements.sort((a, b) => {
            if (a.achieved && !b.achieved) return -1
            if (!a.achieved && b.achieved) return 1
            if (a.achieved && b.achieved) return b.unlocktime - a.unlocktime
            return a.name.localeCompare(b.name)
        })

        return {
            success: true,
            achievements,
            totalAchievements: achievements.length,
            unlockedCount: achievements.filter((a) => a.achieved).length,
            gameName: playerData.playerstats.gameName,
        }
    } catch (err) {
        return {
            success: false,
            achievements: [],
            totalAchievements: 0,
            unlockedCount: 0,
            error: `Network error: ${err instanceof Error ? err.message : 'Unknown error'}`,
            errorCode: 'NETWORK_ERROR',
        }
    }
}
