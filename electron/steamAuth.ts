import http from 'node:http'
import { URL } from 'node:url'
import { shell } from 'electron'

// ═══════════════════════════════════════════════════════════
// Steam OpenID Authentication with Persistent Storage
// ═══════════════════════════════════════════════════════════

const CALLBACK_PORT = 27893
const CALLBACK_URL = `http://localhost:${CALLBACK_PORT}/auth/steam/callback`
const STEAM_OPENID_URL = 'https://steamcommunity.com/openid/login'

// Steam Web API key (set via environment or config)
let steamApiKey: string | null = null

// Store interface for persistence
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

let authServer: http.Server | null = null
let authResolve: ((steamId: string) => void) | null = null
let authReject: ((error: Error) => void) | null = null

/**
 * Initialize auth with persistent storage
 */
export function initAuth(store: AuthStore): void {
    authStore = store
    // Load saved auth state
    const savedAuth = store.get('steamAuth')
    if (savedAuth && savedAuth.isLoggedIn && savedAuth.user) {
        authState = savedAuth
        console.log('[SteamAuth] Restored session for:', savedAuth.user.username)
    }
}

/**
 * Set the Steam API key (should be called on app startup)
 */
export function setSteamApiKey(key: string): void {
    steamApiKey = key
    console.log('[SteamAuth] API key configured')
}

/**
 * Get current auth state
 */
export function getAuthState(): AuthState {
    return authState
}

/**
 * Save auth state to persistent storage
 */
function saveAuthState(): void {
    if (authStore) {
        authStore.set('steamAuth', authState)
    }
}

/**
 * Build Steam OpenID login URL
 */
function buildOpenIdUrl(): string {
    const params = new URLSearchParams({
        'openid.ns': 'http://specs.openid.net/auth/2.0',
        'openid.mode': 'checkid_setup',
        'openid.return_to': CALLBACK_URL,
        'openid.realm': `http://localhost:${CALLBACK_PORT}`,
        'openid.identity': 'http://specs.openid.net/auth/2.0/identifier_select',
        'openid.claimed_id': 'http://specs.openid.net/auth/2.0/identifier_select',
    })
    return `${STEAM_OPENID_URL}?${params.toString()}`
}

/**
 * Start local callback server
 */
function startCallbackServer(): Promise<string> {
    return new Promise((resolve, reject) => {
        authResolve = resolve
        authReject = reject

        authServer = http.createServer((req, res) => {
            const url = new URL(req.url || '', `http://localhost:${CALLBACK_PORT}`)

            if (url.pathname === '/auth/steam/callback') {
                // Extract Steam ID from OpenID response
                const claimedId = url.searchParams.get('openid.claimed_id')

                if (claimedId) {
                    // Steam ID is the last part of the claimed_id URL
                    // Format: https://steamcommunity.com/openid/id/76561198XXXXXXXXX
                    const match = claimedId.match(/\/id\/(\d+)$/)

                    if (match) {
                        const steamId = match[1]
                        console.log('[SteamAuth] ✓ Steam ID received:', steamId)

                        // Send success page
                        res.writeHead(200, { 'Content-Type': 'text/html' })
                        res.end(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Gateway - Steam Login</title>
                                <style>
                                    body {
                                        background: #0a0a0a;
                                        color: #fff;
                                        font-family: system-ui, -apple-system, sans-serif;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        height: 100vh;
                                        margin: 0;
                                        text-align: center;
                                    }
                                    .container {
                                        padding: 2rem;
                                    }
                                    h1 { color: #4ade80; margin-bottom: 1rem; }
                                    p { color: #888; }
                                </style>
                            </head>
                            <body>
                                <div class="container">
                                    <h1>✓ Logged in successfully!</h1>
                                    <p>You can close this window and return to Gateway.</p>
                                    <script>setTimeout(() => window.close(), 2000);</script>
                                </div>
                            </body>
                            </html>
                        `)

                        authResolve?.(steamId)
                        stopCallbackServer()
                    } else {
                        reject(new Error('Invalid Steam ID in response'))
                    }
                } else {
                    // Check if user cancelled
                    const mode = url.searchParams.get('openid.mode')
                    if (mode === 'cancel') {
                        res.writeHead(200, { 'Content-Type': 'text/html' })
                        res.end(`
                            <!DOCTYPE html>
                            <html>
                            <head>
                                <title>Gateway - Login Cancelled</title>
                                <style>
                                    body {
                                        background: #0a0a0a;
                                        color: #fff;
                                        font-family: system-ui, sans-serif;
                                        display: flex;
                                        align-items: center;
                                        justify-content: center;
                                        height: 100vh;
                                        margin: 0;
                                    }
                                </style>
                            </head>
                            <body>
                                <p>Login cancelled. You can close this window.</p>
                                <script>setTimeout(() => window.close(), 2000);</script>
                            </body>
                            </html>
                        `)
                        authReject?.(new Error('Login cancelled by user'))
                        stopCallbackServer()
                    } else {
                        res.writeHead(400)
                        res.end('Invalid response')
                    }
                }
            } else {
                res.writeHead(404)
                res.end('Not found')
            }
        })

        authServer.listen(CALLBACK_PORT, () => {
            console.log('[SteamAuth] Callback server started on port', CALLBACK_PORT)
        })

        authServer.on('error', (err) => {
            console.error('[SteamAuth] Server error:', err)
            reject(err)
        })

        // Timeout after 5 minutes
        setTimeout(() => {
            if (authServer) {
                authReject?.(new Error('Login timeout'))
                stopCallbackServer()
            }
        }, 5 * 60 * 1000)
    })
}

/**
 * Stop callback server
 */
function stopCallbackServer(): void {
    if (authServer) {
        authServer.close()
        authServer = null
        authResolve = null
        authReject = null
        console.log('[SteamAuth] Callback server stopped')
    }
}

/**
 * Fetch user profile from Steam API
 */
async function fetchUserProfile(steamId: string): Promise<SteamUser | null> {
    if (!steamApiKey) {
        console.warn('[SteamAuth] No API key configured, using basic info')
        return {
            steamId,
            username: `Steam User ${steamId.slice(-4)}`,
            avatarUrl: '',
            profileUrl: `https://steamcommunity.com/profiles/${steamId}`,
        }
    }

    try {
        const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${steamApiKey}&steamids=${steamId}`
        const response = await fetch(url)
        const data = await response.json()

        if (data?.response?.players?.[0]) {
            const player = data.response.players[0]
            return {
                steamId,
                username: player.personaname,
                avatarUrl: player.avatarfull,
                profileUrl: player.profileurl,
            }
        }
    } catch (error) {
        console.error('[SteamAuth] Failed to fetch profile:', error)
    }

    return null
}

export interface FetchGamesResult {
    success: boolean
    games: Array<{ appId: string; name: string; playtime: number; lastPlayed?: number }>
    error?: string
    errorCode?: 'NO_API_KEY' | 'PROFILE_PRIVATE' | 'API_ERROR' | 'NETWORK_ERROR' | 'RATE_LIMITED'
}

/**
 * Fetch owned games from Steam API with robust error handling
 */
export async function fetchOwnedGames(steamId: string): Promise<FetchGamesResult> {
    console.log('[SteamAuth] fetchOwnedGames called for Steam ID:', steamId)

    if (!steamApiKey) {
        console.warn('[SteamAuth] No API key configured')
        return {
            success: false,
            games: [],
            error: 'Steam API key is not configured',
            errorCode: 'NO_API_KEY',
        }
    }

    try {
        const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${steamApiKey}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1`
        console.log('[SteamAuth] Calling Steam API...')

        const response = await fetch(url)
        console.log('[SteamAuth] API response status:', response.status)

        // Check for HTTP errors
        if (!response.ok) {
            console.error('[SteamAuth] API returned error status:', response.status, response.statusText)

            if (response.status === 401) {
                return {
                    success: false,
                    games: [],
                    error: 'Invalid Steam API key',
                    errorCode: 'API_ERROR',
                }
            }
            if (response.status === 403) {
                return {
                    success: false,
                    games: [],
                    error: 'Access forbidden. Check API key permissions.',
                    errorCode: 'API_ERROR',
                }
            }
            if (response.status === 429) {
                return {
                    success: false,
                    games: [],
                    error: 'Steam API rate limit exceeded. Please try again later.',
                    errorCode: 'RATE_LIMITED',
                }
            }
            if (response.status === 500 || response.status === 503) {
                return {
                    success: false,
                    games: [],
                    error: 'Steam servers are currently unavailable. Please try again later.',
                    errorCode: 'API_ERROR',
                }
            }

            return {
                success: false,
                games: [],
                error: `Steam API error: ${response.status} ${response.statusText}`,
                errorCode: 'API_ERROR',
            }
        }

        const data = await response.json()
        console.log('[SteamAuth] API response data:', JSON.stringify(data).slice(0, 200) + '...')

        // Check if response has games
        if (data?.response?.games && Array.isArray(data.response.games)) {
            const games = data.response.games.map((game: any) => ({
                appId: String(game.appid),
                name: game.name || `Game ${game.appid}`,
                playtime: game.playtime_forever || 0,
                lastPlayed: game.rtime_last_played || undefined,
            }))

            // Log a few examples for debugging
            const gamesWithPlayTime = games.filter((g: any) => g.lastPlayed && g.lastPlayed > 0)
            console.log('[SteamAuth] Games with lastPlayed data:', gamesWithPlayTime.length, 'out of', games.length)
            if (gamesWithPlayTime.length > 0) {
                console.log('[SteamAuth] Example:', gamesWithPlayTime[0].name, 'lastPlayed:', new Date(gamesWithPlayTime[0].lastPlayed * 1000).toISOString())
            }

            console.log('[SteamAuth] ✓ Fetched', games.length, 'owned games from Steam API')

            if (games.length === 0) {
                return {
                    success: true,
                    games: [],
                    error: 'No games found. Your game library might be empty.',
                }
            }

            return { success: true, games }
        }

        // Empty response object - likely means profile/game details are private
        if (data?.response && Object.keys(data.response).length === 0) {
            console.warn('[SteamAuth] API returned empty response - profile likely private')
            return {
                success: false,
                games: [],
                error: 'Could not access your game library. Please check that your Steam profile AND "Game details" are set to Public in Steam Privacy Settings.',
                errorCode: 'PROFILE_PRIVATE',
            }
        }

        console.warn('[SteamAuth] Unexpected API response format:', data)
        return {
            success: false,
            games: [],
            error: 'Unexpected response from Steam API',
            errorCode: 'API_ERROR',
        }

    } catch (error) {
        console.error('[SteamAuth] Network error fetching owned games:', error)
        return {
            success: false,
            games: [],
            error: `Network error: ${error instanceof Error ? error.message : 'Unknown error'}`,
            errorCode: 'NETWORK_ERROR',
        }
    }
}


/**
 * Start Steam OAuth login flow
 */
export async function loginWithSteam(): Promise<AuthState> {
    console.log('[SteamAuth] Starting Steam login flow...')

    try {
        // Start callback server
        const steamIdPromise = startCallbackServer()

        // Open Steam login page in browser
        const loginUrl = buildOpenIdUrl()
        console.log('[SteamAuth] Opening Steam login page...')
        await shell.openExternal(loginUrl)

        // Wait for callback
        const steamId = await steamIdPromise

        // Fetch user profile
        const user = await fetchUserProfile(steamId)

        if (user) {
            authState = {
                isLoggedIn: true,
                user,
            }
            saveAuthState() // Persist to storage
            console.log('[SteamAuth] ✓ Logged in as:', user.username)
        }

        return authState
    } catch (error) {
        console.error('[SteamAuth] Login failed:', error)
        throw error
    }
}

/**
 * Logout
 */
export function logout(): void {
    authState = {
        isLoggedIn: false,
        user: null,
    }
    saveAuthState() // Persist to storage
    console.log('[SteamAuth] Logged out')
}

/**
 * Get Steam API key status
 */
export function hasApiKey(): boolean {
    return !!steamApiKey
}
