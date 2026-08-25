import { getSteamApiKey, fetchAchievementsViaXml, getAuthState } from '../../../steamAuth'

export interface AchievementDefinition {
    apiname: string
    name: string
    description: string
    icon: string
    icongray: string
    hidden: boolean
    globalPercent?: number
}

export interface FetchAchievementDefinitionsResult {
    success: boolean
    appId: string
    gameName?: string
    definitions: AchievementDefinition[]
    error?: string
    errorCode?: 'NO_SOURCE' | 'NO_ACHIEVEMENTS' | 'API_ERROR' | 'NETWORK_ERROR'
}

interface SchemaAchievement {
    name?: string
    displayName?: string
    description?: string
    icon?: string
    icongray?: string
    hidden?: number
}

/**
 * Global unlock rates. Public endpoint, no key, no ownership — a failure here
 * is non-fatal, we just omit rarity.
 */
async function fetchGlobalPercentages(appId: string): Promise<Map<string, number>> {
    const empty = new Map<string, number>()
    try {
        const url = `https://api.steampowered.com/ISteamUserStats/GetGlobalAchievementPercentagesForApp/v2/?gameid=${appId}`
        const res = await fetch(url, { headers: { Accept: 'application/json' } })
        if (!res.ok) return empty

        const data = await res.json() as {
            achievementpercentages?: { achievements?: Array<{ name?: string; percent?: string | number }> }
        }
        const rows = data.achievementpercentages?.achievements ?? []

        const map = new Map<string, number>()
        for (const row of rows) {
            if (!row?.name) continue
            const pct = typeof row.percent === 'number' ? row.percent : parseFloat(String(row.percent))
            if (!Number.isNaN(pct)) map.set(row.name, pct)
        }
        return map
    } catch {
        return empty
    }
}

/**
 * The achievement LIST for any app — including games the user does not own.
 *
 * GetSchemaForGame describes the game, not the player, so it answers for any
 * appid. (GetPlayerAchievements, by contrast, only answers for games the user
 * owns — which is exactly why unlock state has to be tracked by hand here.)
 */
export async function fetchAchievementDefinitions(appId: string): Promise<FetchAchievementDefinitionsResult> {
    const apiKey = getSteamApiKey()

    if (apiKey) {
        try {
            const schemaUrl = `https://api.steampowered.com/ISteamUserStats/GetSchemaForGame/v2/?key=${apiKey}&appid=${appId}&l=english`
            const [schemaRes, globalPercents] = await Promise.all([
                fetch(schemaUrl, { headers: { Accept: 'application/json' } }),
                fetchGlobalPercentages(appId),
            ])

            if (!schemaRes.ok) {
                return {
                    success: false,
                    appId,
                    definitions: [],
                    error: `Steam returned ${schemaRes.status}`,
                    errorCode: 'API_ERROR',
                }
            }

            const data = await schemaRes.json() as {
                game?: { gameName?: string; availableGameStats?: { achievements?: SchemaAchievement[] } }
            }
            const rows = data.game?.availableGameStats?.achievements ?? []
            const gameName = data.game?.gameName

            if (rows.length === 0) {
                return { success: true, appId, gameName, definitions: [], errorCode: 'NO_ACHIEVEMENTS' }
            }

            const definitions: AchievementDefinition[] = rows
                .filter((row) => !!row?.name)
                .map((row) => ({
                    apiname: row.name!,
                    name: row.displayName || row.name!,
                    description: row.description ?? '',
                    icon: row.icon ?? '',
                    icongray: row.icongray ?? '',
                    hidden: row.hidden === 1,
                    globalPercent: globalPercents.get(row.name!),
                }))

            return { success: true, appId, gameName, definitions }
        } catch (error) {
            return {
                success: false,
                appId,
                definitions: [],
                error: error instanceof Error ? error.message : 'Request failed',
                errorCode: 'NETWORK_ERROR',
            }
        }
    }

    // No API key — fall back to the community XML feed, which also lists every
    // achievement for a non-owned game (all reported locked). Needs a signed-in
    // steamId and a public profile, so it's the weaker of the two paths.
    const auth = getAuthState()
    if (!auth.isLoggedIn || !auth.user) {
        return {
            success: false,
            appId,
            definitions: [],
            error: 'Sign in with Steam or add a Steam API key to load achievements.',
            errorCode: 'NO_SOURCE',
        }
    }

    const xml = await fetchAchievementsViaXml(auth.user.steamId, appId)
    if (!xml.success) {
        return {
            success: false,
            appId,
            definitions: [],
            error: xml.error,
            errorCode: 'API_ERROR',
        }
    }

    const globalPercents = await fetchGlobalPercentages(appId)
    return {
        success: true,
        appId,
        gameName: xml.gameName,
        definitions: xml.achievements.map((a) => ({
            apiname: a.apiname,
            name: a.name,
            description: a.description,
            icon: a.icon,
            icongray: a.icongray,
            hidden: false,
            globalPercent: globalPercents.get(a.apiname),
        })),
        errorCode: xml.achievements.length === 0 ? 'NO_ACHIEVEMENTS' : undefined,
    }
}
