import { BrowserWindow, session, Session } from 'electron'

// ═══════════════════════════════════════════════════════════
// Steam Session Authentication
// ═══════════════════════════════════════════════════════════
//
// Replaces the OpenID-only flow. The user signs in via an embedded
// BrowserWindow that uses a persistent session partition. Cookies survive
// across launches, and we use them to call store/community endpoints
// without a Steam Web API key.
//
// This mirrors Playnite's primary auth path.
//
// What endpoints become accessible with the session:
//   - https://store.steampowered.com/dynamicstore/userdata    (rgOwnedApps[])
//   - https://steamcommunity.com/profiles/{id}/games?xml=1    (game list + playtime)
//   - https://steamcommunity.com/profiles/{id}/stats/{app}/?xml=1  (achievements)
//   - https://steamcommunity.com/my/                          (resolve steamId)
//
// The Web API key remains as a fallback for users with private profiles or
// when the session has expired and re-login is not desired.

const SESSION_PARTITION = 'persist:steam-login'
const STEAM_COMMUNITY = 'https://steamcommunity.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Gateway/1.0'

export interface SteamSessionUser {
    steamId: string
    username: string
    avatarUrl: string
    profileUrl: string
}

function getPartitionSession(): Session {
    return session.fromPartition(SESSION_PARTITION)
}

/**
 * Build a Cookie header from the partition's cookie store for the given URL.
 * Returns empty string if no cookies — caller should still proceed (the request
 * will fail naturally and the higher layer falls back to API-key path).
 */
async function buildCookieHeader(url: string): Promise<string> {
    const cookies = await getPartitionSession().cookies.get({ url })
    return cookies.map((c) => `${c.name}=${c.value}`).join('; ')
}

/**
 * Fetch helper that auto-attaches session cookies + a real-browser User-Agent.
 * Use this for every Steam endpoint call that depends on auth.
 */
export async function steamSessionFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const cookieHeader = await buildCookieHeader(url)
    const headers: Record<string, string> = {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, text/html, application/xml;q=0.9, */*;q=0.8',
        ...(options.headers as Record<string, string> | undefined),
    }
    if (cookieHeader) headers.Cookie = cookieHeader
    return fetch(url, { ...options, headers })
}

/**
 * Cheap check: do we have a `steamLoginSecure` cookie? Doesn't validate
 * freshness, just presence. Use `validateSession()` for an authoritative check.
 */
export async function hasLoginCookie(): Promise<boolean> {
    const cookies = await getPartitionSession().cookies.get({ url: STEAM_COMMUNITY })
    return cookies.some((c) => c.name === 'steamLoginSecure')
}

/**
 * Read the `sessionid` cookie value. Required as a query parameter (CSRF guard)
 * for several internal Steam endpoints — most notably /actions/GetOwnedApps
 * which returns the entire owned-games list with names + icons in one call.
 */
export async function getSessionId(): Promise<string | null> {
    const cookies = await getPartitionSession().cookies.get({ url: STEAM_COMMUNITY })
    const sessionId = cookies.find((c) => c.name === 'sessionid')
    return sessionId?.value ?? null
}

/**
 * Authoritative session validity check. Hits /my/ and inspects redirect target.
 * Logged in  → 302 to /profiles/{id}/ or /id/{vanity}/
 * Logged out → 302 to /login/ (or 200 with login page)
 */
export async function validateSession(): Promise<{ valid: boolean; steamId?: string }> {
    if (!(await hasLoginCookie())) return { valid: false }
    try {
        const res = await steamSessionFetch(`${STEAM_COMMUNITY}/my/`, { redirect: 'manual' })
        if (res.status >= 300 && res.status < 400) {
            const location = res.headers.get('location') || ''
            const profile = location.match(/\/profiles\/(\d+)/)
            if (profile) return { valid: true, steamId: profile[1] }
            // Vanity URL — resolve via the redirected page
            if (/\/id\//.test(location)) {
                const followed = await steamSessionFetch(location)
                const html = await followed.text()
                const m = html.match(/g_rgProfileData\s*=\s*\{[^}]*"steamid":"(\d+)"/)
                if (m) return { valid: true, steamId: m[1] }
            }
        }
        return { valid: false }
    } catch (err) {
        console.warn('[SteamSession] validateSession failed:', err)
        return { valid: false }
    }
}

/**
 * Open an embedded BrowserWindow on Steam's login page. Resolves with the
 * logged-in user's profile once navigation lands on an authenticated page.
 * Rejects if the user closes the window before completing login.
 */
export async function loginWithBrowser(parent?: BrowserWindow | null): Promise<SteamSessionUser> {
    return new Promise((resolve, reject) => {
        const loginWindow = new BrowserWindow({
            width: 1000,
            height: 760,
            title: 'Sign in to Steam',
            backgroundColor: '#101010',
            autoHideMenuBar: true,
            modal: !!parent,
            parent: parent ?? undefined,
            webPreferences: {
                partition: SESSION_PARTITION,
                nodeIntegration: false,
                contextIsolation: true,
                sandbox: true,
                devTools: false,
            },
        })

        let resolved = false
        const finish = (result: SteamSessionUser | Error) => {
            if (resolved) return
            resolved = true
            try { loginWindow.close() } catch { /* already closed */ }
            if (result instanceof Error) reject(result)
            else resolve(result)
        }

        const tryResolveFromUrl = async (url: string) => {
            try {
                const profileMatch = url.match(/steamcommunity\.com\/profiles\/(\d+)/)
                if (profileMatch) {
                    const user = await resolveCurrentUser(profileMatch[1])
                    finish(user)
                    return
                }
                // Vanity URL — resolve via /my/
                if (/steamcommunity\.com\/id\/[^/]+\/?$/.test(url)) {
                    const validation = await validateSession()
                    if (validation.valid && validation.steamId) {
                        const user = await resolveCurrentUser(validation.steamId)
                        finish(user)
                    }
                }
            } catch (err) {
                console.error('[SteamSession] navigation resolver error:', err)
            }
        }

        loginWindow.webContents.on('did-navigate', (_, url) => { tryResolveFromUrl(url) })
        loginWindow.webContents.on('did-navigate-in-page', (_, url) => { tryResolveFromUrl(url) })

        loginWindow.on('closed', () => {
            if (!resolved) finish(new Error('Login window closed before completion'))
        })

        // Land on the standard login page with no return URL — after success
        // Steam typically routes the user to steamcommunity.com home or profile.
        loginWindow.loadURL(`${STEAM_COMMUNITY}/login/home/?goto=my%2Fhome`)
    })
}

/**
 * Resolve a SteamSessionUser given a known steamId.
 *
 * Strategy: HTML profile page first, XML feed as fallback.
 * Reason: the XML feed respects profile-privacy settings even for the profile
 * owner — private profiles return reduced data with no `<avatarFull>`. The
 * HTML version embeds the avatar in the page chrome regardless of privacy
 * when the request carries an authenticated session cookie.
 */
export async function resolveCurrentUser(steamId: string): Promise<SteamSessionUser> {
    const fallback: SteamSessionUser = {
        steamId,
        username: `Steam User ${steamId.slice(-4)}`,
        avatarUrl: '',
        profileUrl: `${STEAM_COMMUNITY}/profiles/${steamId}`,
    }

    // 1. Try HTML — has avatar even on private profiles when authenticated
    try {
        const res = await steamSessionFetch(`${STEAM_COMMUNITY}/profiles/${steamId}/`)
        if (res.ok) {
            const html = await res.text()
            const fromHtml = parseProfileFromHtml(html, steamId)
            if (fromHtml.avatarUrl || fromHtml.username !== fallback.username) {
                return fromHtml
            }
        }
    } catch (err) {
        console.warn('[SteamSession] HTML profile fetch failed:', err)
    }

    // 2. Fallback to XML feed
    try {
        const res = await steamSessionFetch(`${STEAM_COMMUNITY}/profiles/${steamId}/?xml=1`)
        if (res.ok) {
            const text = await res.text()
            const username =
                text.match(/<steamID>\s*<!\[CDATA\[([^\]]+)\]\]>/)?.[1] ||
                text.match(/<steamID>([^<]+)<\/steamID>/)?.[1] ||
                fallback.username
            const avatarUrl =
                text.match(/<avatarFull>\s*<!\[CDATA\[([^\]]+)\]\]>/)?.[1] ||
                text.match(/<avatarFull>([^<]+)<\/avatarFull>/)?.[1] ||
                ''
            return { ...fallback, username, avatarUrl }
        }
    } catch (err) {
        console.warn('[SteamSession] XML profile fetch failed:', err)
    }

    return fallback
}

/**
 * Parse username + avatar from the HTML profile page.
 *
 * Steam embeds avatar in multiple selectors depending on profile type. We try
 * the highest-quality source first (the in-page playerAvatarAutoSizeInner div)
 * then fall back to the navbar's user_avatar link (lower res but always present
 * when authenticated).
 */
function parseProfileFromHtml(html: string, steamId: string): SteamSessionUser {
    // Avatar — prefer the full-size in-page avatar, fall back to medium navbar avatar
    const fullAvatar =
        html.match(/playerAvatarAutoSizeInner[^>]*>\s*<img[^>]*src="([^"]+)"/i)?.[1] ||
        html.match(/<img[^>]+src="(https:\/\/avatars\.[^"]+_full\.[a-z]+)"/i)?.[1] ||
        html.match(/<img[^>]+src="(https:\/\/avatars\.[^"]+_medium\.[a-z]+)"/i)?.[1] ||
        ''

    // Username — try multiple patterns
    const username =
        html.match(/<span class="actual_persona_name">([^<]+)<\/span>/)?.[1] ||
        html.match(/<title>Steam Community ::\s*([^<]+?)<\/title>/)?.[1]?.trim() ||
        `Steam User ${steamId.slice(-4)}`

    return {
        steamId,
        username: decodeHtmlEntities(username),
        avatarUrl: fullAvatar,
        profileUrl: `${STEAM_COMMUNITY}/profiles/${steamId}`,
    }
}

function decodeHtmlEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
}

/**
 * Clear all cookies + storage for the Steam session partition.
 * Use on logout.
 */
export async function clearSession(): Promise<void> {
    await getPartitionSession().clearStorageData({
        storages: ['cookies', 'localstorage', 'indexdb', 'serviceworkers', 'cachestorage'],
    })
}
