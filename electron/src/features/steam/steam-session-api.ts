import { steamSessionFetch, getSessionId } from '../../../steamSession'

// ═══════════════════════════════════════════════════════════
// Steam Session API — read data without a Web API key
// ═══════════════════════════════════════════════════════════
//
// These endpoints work as long as the user has an active Steam web session
// (cookies in our partition). Output formats match the shapes returned by
// steamAuth.ts so the IPC handlers can transparently swap between paths.

const STEAM_STORE = 'https://store.steampowered.com'
const STEAM_COMMUNITY = 'https://steamcommunity.com'

// ─── Owned games ────────────────────────────────────────────

export interface SessionOwnedGame {
    appId: string
    name: string
    playtime: number       // minutes (matches IPlayerService format)
    lastPlayed?: number    // unix timestamp seconds
}

export interface SessionOwnedGamesResult {
    success: boolean
    games: SessionOwnedGame[]
    error?: string
}

/**
 * Pulls the full owned-games list with names via Steam's internal community
 * endpoint /actions/GetOwnedApps?sessionid=X.
 *
 * This endpoint:
 *   - Returns appid + name + icon + logo per game in a SINGLE JSON call
 *   - Works regardless of profile privacy (it's the user's own data view,
 *     not their public profile view)
 *   - Has no rate limiting (it's what Steam's own UI uses)
 *   - Replaces what was a triple-fallback nightmare (dynamicstore + XML +
 *     bulk app list) for the common case
 *
 * Fallback chain if this fails:
 *   1. dynamicstore/userdata for the appId list, names left as placeholders
 *      (community XML enrichment skipped — it's unreliable when privacy
 *      blocks it, which is the same case where GetOwnedApps would have failed)
 *   2. Caller path (steamAuth.fetchOwnedGames) falls through to API key
 */
export async function fetchOwnedGamesViaSession(steamId: string): Promise<SessionOwnedGamesResult> {
    // ─── Primary: /actions/GetOwnedApps (names + appIds in one shot) ───
    const sessionId = await getSessionId()
    if (sessionId) {
        try {
            const url = `${STEAM_COMMUNITY}/actions/GetOwnedApps/?sessionid=${encodeURIComponent(sessionId)}`
            const res = await steamSessionFetch(url, {
                headers: { Accept: 'application/json' },
            })
            if (res.ok) {
                const text = await res.text()
                // Endpoint sometimes returns HTML (login page) when session is bad.
                // Detect by trying to parse as JSON array.
                try {
                    const data = JSON.parse(text) as Array<{ appid: number; name: string }>
                    if (Array.isArray(data) && data.length > 0) {
                        const games: SessionOwnedGame[] = data
                            .filter((entry) => entry.appid && entry.name)
                            .map((entry) => ({
                                appId: String(entry.appid),
                                name: entry.name,
                                playtime: 0, // playtime not exposed by this endpoint
                            }))
                        console.log('[SteamSessionApi] ✓ GetOwnedApps returned', games.length, 'games with names')
                        return { success: true, games }
                    }
                } catch {
                    // Not JSON — endpoint returned HTML (login page) or other.
                    // Fall through to fallback.
                }
            }
            console.warn('[SteamSessionApi] GetOwnedApps returned', res.status, '— falling back to dynamicstore')
        } catch (err) {
            console.warn('[SteamSessionApi] GetOwnedApps fetch failed, falling back:', err)
        }
    } else {
        console.warn('[SteamSessionApi] No sessionid cookie — skipping GetOwnedApps, using dynamicstore')
    }

    // ─── Fallback: dynamicstore/userdata (appIds only, placeholder names) ───
    try {
        const userdataRes = await steamSessionFetch(`${STEAM_STORE}/dynamicstore/userdata/`)
        if (!userdataRes.ok) {
            return { success: false, games: [], error: `userdata returned ${userdataRes.status}` }
        }
        const userdata = await userdataRes.json() as { rgOwnedApps?: number[] }
        const ownedAppIds = new Set((userdata.rgOwnedApps ?? []).map((id) => String(id)))
        if (ownedAppIds.size === 0) {
            return { success: false, games: [], error: 'No owned apps returned — session may be expired' }
        }

        // Optional enrichment from community games XML (mostly returns nothing
        // for private profiles, but might catch some games). Worth the cheap try.
        const enriched = new Map<string, SessionOwnedGame>()
        try {
            const xmlRes = await steamSessionFetch(`${STEAM_COMMUNITY}/profiles/${steamId}/games?tab=all&xml=1`)
            if (xmlRes.ok) {
                const xml = await xmlRes.text()
                for (const game of iterateGamesXml(xml)) {
                    if (ownedAppIds.has(game.appId)) {
                        enriched.set(game.appId, game)
                    }
                }
            }
        } catch (err) {
            console.warn('[SteamSessionApi] community games XML enrichment failed:', err)
        }

        // Placeholder uses "Game ${appId}" — downstream resolvers recognise this prefix.
        const games: SessionOwnedGame[] = []
        for (const appId of ownedAppIds) {
            games.push(enriched.get(appId) ?? { appId, name: `Game ${appId}`, playtime: 0 })
        }

        console.log('[SteamSessionApi] dynamicstore fallback returned', games.length, 'games (', enriched.size, 'with names from XML)')
        return { success: true, games }
    } catch (err) {
        return {
            success: false,
            games: [],
            error: err instanceof Error ? err.message : 'Unknown error',
        }
    }
}

function* iterateGamesXml(xml: string): Generator<SessionOwnedGame> {
    // <game> entries inside <gamesList><games>...</games></gamesList>
    //
    // IMPORTANT: placeholder MUST be "Game ${appId}" — every downstream name
    // resolver (bulk app-list lookup, merge update, background straggler
    // resolver) matches that prefix. Using "App ${appId}" here would make
    // these games invisible to all three resolution paths.
    //
    // Steam returns <game><appID>X</appID></game> with no <name> when the
    // user's "Game details" privacy setting is private — common scenario.
    const re = /<game>([\s\S]*?)<\/game>/g
    let match: RegExpExecArray | null
    while ((match = re.exec(xml)) !== null) {
        const body = match[1]
        const appId = pickXml(body, 'appID')
        if (!appId) continue
        const name = pickXml(body, 'name') ?? `Game ${appId}`
        const hours = parseFloat(pickXml(body, 'hoursOnRecord')?.replace(/,/g, '') ?? '0')
        const playtime = Number.isFinite(hours) ? Math.round(hours * 60) : 0
        yield { appId, name, playtime }
    }
}

// ─── Achievements ───────────────────────────────────────────

export interface SessionAchievement {
    apiname: string
    name: string
    description: string
    achieved: boolean
    unlocktime: number
    icon: string
    icongray: string
}

export interface SessionAchievementsResult {
    success: boolean
    achievements: SessionAchievement[]
    totalAchievements: number
    unlockedCount: number
    gameName?: string
    error?: string
    errorCode?: 'NO_SESSION' | 'PROFILE_PRIVATE' | 'NO_ACHIEVEMENTS' | 'NETWORK_ERROR'
}

/**
 * Fetch achievements for a specific game via the community stats feed.
 * Requires either an active session cookie OR the user's profile to be public.
 *
 * Endpoint: /profiles/{id}/stats/{appId}/?xml=1
 *
 * Returns the same shape as the API-key path for drop-in fallback.
 */
export async function fetchAchievementsViaSession(
    steamId: string,
    appId: string
): Promise<SessionAchievementsResult> {
    try {
        const res = await steamSessionFetch(
            `${STEAM_COMMUNITY}/profiles/${steamId}/stats/${appId}/?xml=1&l=english`
        )
        if (!res.ok) {
            // 401/403/404 typically = private / no such stats / not owned
            if (res.status === 401 || res.status === 403) {
                return emptyAchievementResult('Profile or game stats are private', 'PROFILE_PRIVATE')
            }
            return emptyAchievementResult(`HTTP ${res.status}`, 'NETWORK_ERROR')
        }
        const xml = await res.text()

        // Steam returns an HTML login page when not authenticated — detect early.
        if (xml.includes('g_steamID = false') || xml.includes('<title>Sign In')) {
            return emptyAchievementResult('No active Steam session', 'NO_SESSION')
        }

        // Empty/invalid achievements section → game has none
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
        const achievements: SessionAchievement[] = []
        const blockRe = /<achievement(?:\s+closed="(\d)")?>([\s\S]*?)<\/achievement>/g
        let m: RegExpExecArray | null
        while ((m = blockRe.exec(xml)) !== null) {
            const closedAttr = m[1]
            const body = m[2]
            // `closed` can be either an attribute or an inner element depending on Steam's feed version.
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

function emptyAchievementResult(
    error: string,
    errorCode: SessionAchievementsResult['errorCode']
): SessionAchievementsResult {
    return {
        success: false,
        achievements: [],
        totalAchievements: 0,
        unlockedCount: 0,
        error,
        errorCode,
    }
}

// ─── shared XML helper ──────────────────────────────────────

/**
 * Extract the inner text of the first <tag> match in `xml`. Handles both
 * CDATA-wrapped and plain text. Returns null if missing.
 */
function pickXml(xml: string, tag: string): string | null {
    const cdata = new RegExp(`<${tag}>\\s*<!\\[CDATA\\[([\\s\\S]*?)\\]\\]>`).exec(xml)
    if (cdata) return cdata[1].trim()
    const plain = new RegExp(`<${tag}>([\\s\\S]*?)<\\/${tag}>`).exec(xml)
    if (plain) return decodeEntities(plain[1].trim())
    return null
}

function decodeEntities(text: string): string {
    return text
        .replace(/&amp;/g, '&')
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&quot;/g, '"')
        .replace(/&#39;/g, "'")
        .replace(/&apos;/g, "'")
}
