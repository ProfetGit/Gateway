// ═══════════════════════════════════════════════════════════
// Steam Authentication
// ═══════════════════════════════════════════════════════════
//
// Login: system-browser OpenID flow (openid.ts) — no embedded BrowserWindow
// session cookies (that was the pre-Tauri design; the Tauri port replaced it
// with OpenID + a Web API key fallback, and this Electron rewrite matches
// that current behavior rather than reintroducing cookie-session auth).
//
// Owned games: Steam Web API key only. Achievements: public community XML
// stats feed first (works for public profiles with no key needed), then
// API key fallback.

import { loginWithOpenId } from './openid'
import { resolveCurrentUser, steamFetch, pickXml, SteamUser } from './steamHttp'

// ─── Module state ───────────────────────────────────────────

let steamApiKey: string | null = null

interface AuthStore {
    get: (key: 'steamAuth') => AuthState | undefined
    set: (key: 'steamAuth', value: AuthState) => void
}

let authStore: AuthStore | null = null

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
 * Refresh display data (avatar, username) for a returning user. Called
 * once from main.ts after initAuth.
 */
export async function refreshSessionOnStartup(): Promise<void> {
    if (!authState.isLoggedIn || !authState.user) return
    const fresh = await resolveCurrentUser(authState.user.steamId)
    authState = { isLoggedIn: true, user: fresh }
    saveAuthState()
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
    console.log('[SteamAuth] Starting OpenID login (system browser)...')
    const steamId = await loginWithOpenId()
    let user = await resolveCurrentUser(steamId)

    // Backfill avatar via API key if scraping returned empty
    if (!user.avatarUrl && steamApiKey) {
        const enriched = await enrichUserWithApiKey(steamId, steamApiKey)
        if (enriched) user = enriched
    }

    authState = { isLoggedIn: true, user }
    saveAuthState()
    console.log('[SteamAuth] ✓ Logged in as:', user.username)
    return authState
}

export function logout(): void {
    authState = { isLoggedIn: false, user: null }
    saveAuthState()
    console.log('[SteamAuth] Logged out')
}

// ─── Profile enrichment via API key ──────────────────────────

export async function enrichUserWithApiKey(steamId: string, apiKey: string): Promise<SteamUser | null> {
    try {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${apiKey}&steamids=${steamId}`
        const res = await steamFetch(url)
        if (!res.ok) return null
        const data = await res.json()
        const player = data?.response?.players?.[0]
        if (!player) return null
        return {
            steamId,
            username: player.personaname || `Steam User ${steamId.slice(-4)}`,
            avatarUrl: player.avatarfull || player.avatarmedium || '',
            profileUrl: player.profileurl || `https://steamcommunity.com/profiles/${steamId}`,
        }
    } catch {
        return null
    }
}

// ─── Owned games (Steam Web API key) ─────────────────────────

export interface FetchGamesResult {
    success: boolean
    games: Array<{ appId: string; name: string; playtime: number; lastPlayed?: number }>
    error?: string
    errorCode?: 'NO_API_KEY' | 'PROFILE_PRIVATE' | 'API_ERROR' | 'NETWORK_ERROR' | 'RATE_LIMITED' | 'NO_AUTH'
}

export async function fetchOwnedGames(steamId: string): Promise<FetchGamesResult> {
    if (!steamApiKey) {
        return {
            success: false,
            games: [],
            error: 'No Web API key configured. Sign in to Steam and add an API key in Settings.',
            errorCode: 'NO_AUTH',
        }
    }
    return fetchOwnedGamesViaApiKey(steamId, steamApiKey)
}

async function fetchOwnedGamesViaApiKey(steamId: string, apiKey: string): Promise<FetchGamesResult> {
    try {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${apiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`
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
            const UNWANTED_NAMES = [
                'OBS Studio', 'Wallpaper Engine', 'Soundpad', 'ShareX', 'Blender',
                'Spacewar', 'SteamCMD', 'Source SDK Base 2013 Singleplayer',
                'Source SDK Base 2013 Multiplayer', 'Source SDK Base 2007',
                'Source SDK Base 2006', 'Valve Hammer Editor',
                'Steamworks Common Redistributables', 'SteamVR',
            ]

            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const filtered = games.filter((g: any) => {
                const name = g.name || ''
                if (UNWANTED_NAMES.includes(name)) return false
                return !UNWANTED_KEYWORDS.some((kw) => name.includes(kw))
            })

            return filtered.length > 0
                ? { success: true, games: filtered }
                : { success: true, games: [], error: 'No games found in library' }
        }

        if (data?.response && Object.keys(data.response).length === 0) {
            return apiKeyError(
                'Steam profile is private. Set Profile + Game details to Public, or sign in via the Setup wizard.',
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

// ─── Achievements (public XML feed → API key fallback) ───────

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
    errorCode?: 'NO_API_KEY' | 'PROFILE_PRIVATE' | 'NO_ACHIEVEMENTS' | 'API_ERROR' | 'NETWORK_ERROR' | 'NO_AUTH' | 'NO_SESSION'
}

export async function fetchPlayerAchievements(
    steamId: string,
    appId: string
): Promise<FetchAchievementsResult> {
    const xmlResult = await fetchAchievementsViaXml(steamId, appId)
    if (xmlResult.success || xmlResult.errorCode === 'NO_ACHIEVEMENTS') {
        return xmlResult
    }

    if (steamApiKey) {
        return fetchAchievementsViaApiKey(steamId, appId, steamApiKey)
    }
    return {
        success: false,
        achievements: [],
        totalAchievements: 0,
        unlockedCount: 0,
        error: xmlResult.error ?? 'Achievement data unavailable',
        errorCode: xmlResult.errorCode === 'PROFILE_PRIVATE' ? 'PROFILE_PRIVATE' : 'NO_AUTH',
    }
}

async function fetchAchievementsViaXml(
    steamId: string,
    appId: string
): Promise<FetchAchievementsResult> {
    try {
        const res = await steamFetch(
            `https://steamcommunity.com/profiles/${steamId}/stats/${appId}/?xml=1&l=english`
        )
        if (!res.ok) {
            if (res.status === 401 || res.status === 403) {
                return emptyAchievementResult('Profile or game stats are private', 'PROFILE_PRIVATE')
            }
            return emptyAchievementResult(`HTTP ${res.status}`, 'NETWORK_ERROR')
        }
        const xml = await res.text()

        if (xml.includes('g_steamID = false') || xml.includes('<title>Sign In')) {
            return emptyAchievementResult('No active Steam session', 'NO_SESSION')
        }

        if (!xml.includes('<achievements>')) {
            const gameName = pickXml(xml, 'gameName') ?? undefined
            return {
                success: true,
                achievements: [],
                totalAchievements: 0,
                unlockedCount: 0,
                gameName,
                errorCode: 'NO_ACHIEVEMENTS',
            }
        }

        const gameName = pickXml(xml, 'gameName') ?? undefined
        const achievements: Achievement[] = []
        const blockRe = /<achievement(?:\s+closed="(\d)")?>([\s\S]*?)<\/achievement>/g
        let m: RegExpExecArray | null
        while ((m = blockRe.exec(xml)) !== null) {
            const closedAttr = m[1]
            const body = m[2]
            const closedInner = pickXml(body, 'closed')
            const achieved = closedAttr === '1' || closedInner === '1'
            const apiname = pickXml(body, 'apiname') ?? ''
            const name = pickXml(body, 'name') ?? apiname
            const description = pickXml(body, 'description') ?? ''
            const icon = pickXml(body, 'iconClosed') ?? ''
            const icongray = pickXml(body, 'iconOpen') ?? ''
            const unlockTimestamp = parseInt(pickXml(body, 'unlockTimestamp') ?? '0', 10)
            achievements.push({
                apiname,
                name,
                description,
                achieved,
                unlocktime: Number.isFinite(unlockTimestamp) ? unlockTimestamp : 0,
                icon,
                icongray,
            })
        }

        if (achievements.length === 0) {
            return {
                success: true,
                achievements: [],
                totalAchievements: 0,
                unlockedCount: 0,
                gameName,
                errorCode: 'NO_ACHIEVEMENTS',
            }
        }

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
            gameName,
        }
    } catch (err) {
        return emptyAchievementResult(
            err instanceof Error ? err.message : 'Unknown error',
            'NETWORK_ERROR'
        )
    }
}

async function fetchAchievementsViaApiKey(
    steamId: string,
    appId: string,
    apiKey: string
): Promise<FetchAchievementsResult> {
    try {
        const [playerResponse, schemaResponse] = await Promise.all([
            fetch(`https://api.steampowered.com/ISteamUserStats/GetPlayerAchievements/v1/?key=${apiKey}&steamid=${steamId}&appid=${appId}&l=english`),
            fetch(`https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${appId}&l=english`),
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

function emptyAchievementResult(
    error: string,
    errorCode: FetchAchievementsResult['errorCode']
): FetchAchievementsResult {
    return {
        success: false,
        achievements: [],
        totalAchievements: 0,
        unlockedCount: 0,
        error,
        errorCode,
    }
}
