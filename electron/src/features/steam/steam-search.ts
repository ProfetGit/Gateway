import { ipcMain } from 'electron'

// Steam's community app-search endpoint: public, no API key, no ownership.
// Used to map a non-Steam shortcut's title onto a Steam appid so we can pull
// its store details, news, and achievement definitions.
const SEARCH_CACHE_TTL = 10 * 60 * 1000
const MIN_QUERY_LENGTH = 2
const MAX_RESULTS = 12

interface SteamAppSearchHit {
    appId: string
    name: string
    /** Small landscape capsule, straight from the search response. */
    capsuleUrl?: string
    iconUrl?: string
}

interface SearchSteamAppsResult {
    success: boolean
    results: SteamAppSearchHit[]
    error?: string
    errorCode?: 'API_ERROR' | 'NETWORK_ERROR'
}

const searchCache = new Map<string, { data: SteamAppSearchHit[]; fetchedAt: number }>()

export function setupSteamSearchHandlers() {
    ipcMain.handle('search_steam_apps', async (_event, { query }: { query: string }): Promise<SearchSteamAppsResult> => {
        const trimmed = (query ?? '').trim()
        if (trimmed.length < MIN_QUERY_LENGTH) {
            return { success: true, results: [] }
        }

        const cacheKey = trimmed.toLowerCase()
        const cached = searchCache.get(cacheKey)
        if (cached && Date.now() - cached.fetchedAt < SEARCH_CACHE_TTL) {
            return { success: true, results: cached.data }
        }

        try {
            const url = `https://steamcommunity.com/actions/SearchApps/${encodeURIComponent(trimmed)}`
            const res = await fetch(url, { headers: { Accept: 'application/json' } })

            if (!res.ok) {
                return {
                    success: false,
                    results: [],
                    error: `Steam returned ${res.status}`,
                    errorCode: 'API_ERROR',
                }
            }

            // `logo` and `icon` are content-hashed URLs. Keeping them matters:
            // newer apps (How to Fish, 4001890) 404 on the guessable
            // .../<appid>/header.jpg path, so a thumbnail built by guessing
            // renders blank for exactly the games people are searching for.
            const raw = await res.json() as Array<{
                appid?: string | number
                name?: string
                logo?: string
                icon?: string
            }>
            const results: SteamAppSearchHit[] = (Array.isArray(raw) ? raw : [])
                .filter((hit) => hit?.appid !== undefined && !!hit?.name)
                .slice(0, MAX_RESULTS)
                .map((hit) => ({
                    appId: String(hit.appid),
                    name: String(hit.name),
                    ...(hit.logo ? { capsuleUrl: String(hit.logo) } : {}),
                    ...(hit.icon ? { iconUrl: String(hit.icon) } : {}),
                }))

            searchCache.set(cacheKey, { data: results, fetchedAt: Date.now() })
            return { success: true, results }
        } catch (error) {
            console.error('[Main] Steam app search failed:', error)
            return {
                success: false,
                results: [],
                error: error instanceof Error ? error.message : 'Search failed',
                errorCode: 'NETWORK_ERROR',
            }
        }
    })
}
