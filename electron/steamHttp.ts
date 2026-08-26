// ═══════════════════════════════════════════════════════════
// Steam HTTP helpers — plain fetch, no cookies
// ═══════════════════════════════════════════════════════════
//
// Ported from the Tauri backend's session.rs. Login now happens via system
// -browser OpenID (see openid.ts), which doesn't hand us Steam session
// cookies — so profile resolution scrapes the *public* profile page/XML
// feed instead of an authenticated one. Private profiles fall back to the
// placeholder user record; the Web API key path (steamAuth.ts) can enrich
// avatar/username further once configured.

const STEAM_COMMUNITY = 'https://steamcommunity.com'
const USER_AGENT = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Gateway/1.0'

export interface SteamUser {
    steamId: string
    username: string
    avatarUrl: string
    profileUrl: string
}

export async function steamFetch(url: string, options: RequestInit = {}): Promise<Response> {
    const headers: Record<string, string> = {
        'User-Agent': USER_AGENT,
        Accept: 'application/json, text/html, application/xml;q=0.9, */*;q=0.8',
        ...(options.headers as Record<string, string> | undefined),
    }
    return fetch(url, { ...options, headers })
}

/**
 * Resolve a SteamUser from a known steamId by scraping the public profile
 * page. Falls back to a placeholder if the profile is private or the
 * request fails.
 */
export async function resolveCurrentUser(steamId: string): Promise<SteamUser> {
    const fallback: SteamUser = {
        steamId,
        username: `Steam User ${steamId.slice(-4)}`,
        avatarUrl: '',
        profileUrl: `${STEAM_COMMUNITY}/profiles/${steamId}`,
    }

    try {
        const res = await steamFetch(`${STEAM_COMMUNITY}/profiles/${steamId}/`)
        if (res.ok) {
            const html = await res.text()
            const parsed = parseProfileFromHtml(html, steamId)
            if (parsed.avatarUrl || parsed.username !== fallback.username) {
                return parsed
            }
        }
    } catch (err) {
        console.warn('[SteamHttp] HTML profile fetch failed:', err)
    }

    try {
        const res = await steamFetch(`${STEAM_COMMUNITY}/profiles/${steamId}/?xml=1`)
        if (res.ok) {
            const text = await res.text()
            const username = pickXml(text, 'steamID') ?? fallback.username
            const avatarUrl = pickXml(text, 'avatarFull') ?? ''
            return { ...fallback, username, avatarUrl }
        }
    } catch (err) {
        console.warn('[SteamHttp] XML profile fetch failed:', err)
    }

    return fallback
}

function parseProfileFromHtml(html: string, steamId: string): SteamUser {
    // Prefer the og:image/image_src meta tags — they always point at the
    // profile owner's actual avatar. Scraping <img> tags inside the avatar
    // frame markup is unreliable: an equipped animated avatar frame item
    // replaces the plain avatar <img> there, and the naive "first _medium.jpg
    // on the page" fallback can match someone else's avatar from a friends/
    // recently-played list further down the page.
    const fullAvatar =
        html.match(/<meta property="og:image" content="([^"]+)"/i)?.[1] ||
        html.match(/<link rel="image_src" href="([^"]+)"/i)?.[1] ||
        ''

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

export function pickXml(xml: string, tag: string): string | null {
    const cdata = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`).exec(xml)
    if (cdata) return cdata[1].trim()
    const plain = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml)
    if (plain) return decodeHtmlEntities(plain[1].trim())
    return null
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
