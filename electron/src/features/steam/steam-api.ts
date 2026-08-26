import { ipcMain } from 'electron'

// ═══════════════════════════════════════════════════════════
// Helper to fetch game details from Steam Store API
// ═══════════════════════════════════════════════════════════
export async function fetchSteamStoreDetails(appIds: string[]) {
    if (appIds.length === 0) return []

    const games: { appId: string; name: string; playtime: number; lastPlayed: undefined }[] = []

    for (const appId of appIds) {
        try {
            const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`
            const res = await fetch(url, {
                headers: {
                    'Accept-Encoding': 'gzip, deflate',
                    'Accept': 'application/json'
                }
            })

            if (!res.ok) {
                console.warn('[Main] Store API returned', res.status, 'for', appId)
                continue
            }

            const data = await res.json() as Record<string, { success: boolean; data: { name: string; steam_appid: number } }>

            if (data[appId]?.success && data[appId]?.data?.name) {
                games.push({
                    appId: String(data[appId].data.steam_appid),
                    name: data[appId].data.name,
                    playtime: 0,
                    lastPlayed: undefined
                })
            }
        } catch (error) {
            console.error('[Main] Failed to fetch store details for', appId, ':', error)
        }
    }

    return games
}

export function setupSteamApiHandlers() {
    // ═══════════════════════════════════════════════════════════
    // Trending Games (Steam Store API)
    // ═══════════════════════════════════════════════════════════

    let trendingCache: { data: unknown; fetchedAt: number } | null = null
    const TRENDING_CACHE_TTL = 10 * 60 * 1000

    let trendingRequest: Promise<{ success: boolean; data?: unknown; error?: string }> | null = null

    ipcMain.handle('get_trending_games', async () => {
        if (trendingCache && Date.now() - trendingCache.fetchedAt < TRENDING_CACHE_TTL) {
            return { success: true, data: trendingCache.data }
        }
        if (trendingRequest) return trendingRequest

        trendingRequest = (async () => {
            try {
                const response = await fetch('https://store.steampowered.com/api/featuredcategories?cc=us&l=en')
                if (!response.ok) throw new Error(`Steam API returned ${response.status}`)

                const rawData = await response.json() as {
                    top_sellers?: {
                        items?: Array<{
                            id: number
                            name: string
                            header_image?: string
                            small_capsule_image?: string
                            discount_percent?: number
                            original_price?: number
                            final_price?: number
                            windows_available?: boolean
                            linux_available?: boolean
                            mac_available?: boolean
                        }>
                    }
                }

                const topSellers = rawData.top_sellers?.items || []
                const hardwareIds = new Set([1675200, 1675180, 353380, 530260, 353370])
                const filteredItems = topSellers.filter(item => {
                    if (hardwareIds.has(item.id)) return false
                    const nameLower = item.name.toLowerCase()
                    const hardwarePatterns = ['steam deck', 'controller', 'hardware', 'dock', 'steam link', 'valve index']
                    return !hardwarePatterns.some(pattern => nameLower.includes(pattern))
                })

                const games = filteredItems.slice(0, 12).map(item => ({
                    id: item.id,
                    name: item.name,
                    headerImage: item.header_image || `https://steamcdn-a.akamaihd.net/steam/apps/${item.id}/header.jpg`,
                    capsuleImage: item.small_capsule_image || `https://steamcdn-a.akamaihd.net/steam/apps/${item.id}/capsule_184x69.jpg`,
                    discountPercent: item.discount_percent || 0,
                    originalPrice: item.original_price ? `$${(item.original_price / 100).toFixed(2)}` : undefined,
                    finalPrice: item.final_price ? (item.final_price === 0 ? 'Free' : `$${(item.final_price / 100).toFixed(2)}`) : undefined,
                    windowsAvailable: item.windows_available ?? true,
                    linuxAvailable: item.linux_available ?? false,
                    macAvailable: item.mac_available ?? false,
                }))

                const trendingData = { games, fetchedAt: Date.now(), source: 'top_sellers' as const }
                trendingCache = { data: trendingData, fetchedAt: Date.now() }
                console.log('[Main] ✓ Fetched', games.length, 'trending games from Steam')
                return { success: true, data: trendingData }
            } catch (error) {
                console.error('[Main] Failed to fetch trending games:', error)
                return { success: false, error: error instanceof Error ? error.message : 'Failed to fetch trending games' }
            } finally {
                trendingRequest = null
            }
        })()

        return trendingRequest
    })

    // ═══════════════════════════════════════════════════════════
    // Game News / Patch Notes
    // ═══════════════════════════════════════════════════════════

    const newsCache = new Map<string, { data: unknown; fetchedAt: number }>()
    const NEWS_CACHE_TTL = 5 * 60 * 1000

    ipcMain.handle('get_game_news', async (_event, { appId, count = 10 }: { appId: string; count?: number }) => {
        if (!appId) {
            return { success: false, news: [], totalCount: 0, error: 'No Steam App ID provided', errorCode: 'NO_STEAM_APP' as const }
        }

        const cached = newsCache.get(appId)
        if (cached && Date.now() - cached.fetchedAt < NEWS_CACHE_TTL) {
            return cached.data
        }

        try {
            const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=${count}&maxlength=0&format=json&feeds=steam_community_announcements`
            const response = await fetch(url)
            if (!response.ok) throw new Error(`Steam API returned ${response.status}`)

            const data = await response.json() as {
                appnews?: {
                    appid: number
                    newsitems: Array<{
                        gid: string
                        title: string
                        url: string
                        author: string
                        contents: string
                        feedlabel: string
                        feedname: string
                        date: number
                    }>
                    count: number
                }
            }

            if (!data.appnews || !data.appnews.newsitems) {
                return { success: true, news: [], totalCount: 0 }
            }

            const news = data.appnews.newsitems.map(item => ({
                gid: item.gid,
                title: item.title,
                url: item.url,
                author: item.author || 'Unknown',
                contents: item.contents,
                feedlabel: item.feedlabel,
                feedname: item.feedname,
                date: item.date,
                appId: String(data.appnews!.appid),
            }))

            const result = { success: true, news, totalCount: data.appnews.count }
            newsCache.set(appId, { data: result, fetchedAt: Date.now() })
            return result
        } catch (error) {
            console.error('[Main] Failed to fetch game news:', error)
            return {
                success: false,
                news: [],
                totalCount: 0,
                error: error instanceof Error ? error.message : 'Failed to fetch game news',
                errorCode: 'NETWORK_ERROR' as const,
            }
        }
    })

    // ═══════════════════════════════════════════════════════════
    // Game Details (Steam Store API)
    // ═══════════════════════════════════════════════════════════

    const detailsCache = new Map<string, { data: unknown; fetchedAt: number }>()
    const DETAILS_CACHE_TTL = 30 * 60 * 1000

    ipcMain.handle('get_game_details', async (_event, { appId }: { appId: string }) => {
        if (!appId) {
            return { success: false, details: null, error: 'No Steam App ID provided', errorCode: 'NO_STEAM_APP' as const }
        }

        const cached = detailsCache.get(appId)
        if (cached && Date.now() - cached.fetchedAt < DETAILS_CACHE_TTL) {
            return cached.data
        }

        try {
            const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=en`
            const response = await fetch(url)
            if (!response.ok) throw new Error(`Steam Store API returned ${response.status}`)

            const data = await response.json() as {
                [key: string]: {
                    success: boolean
                    data?: {
                        name: string
                        short_description: string
                        detailed_description: string
                        developers?: string[]
                        publishers?: string[]
                        release_date?: { date: string }
                        metacritic?: { score: number; url: string }
                        pc_requirements?: { minimum?: string; recommended?: string }
                        genres?: Array<{ description: string }>
                        categories?: Array<{ description: string }>
                    }
                }
            }

            const appData = data[appId]
            if (!appData?.success || !appData.data) {
                return { success: false, details: null, error: 'Game details not found', errorCode: 'API_ERROR' as const }
            }

            const d = appData.data
            const details = {
                appId,
                name: d.name,
                shortDescription: d.short_description || '',
                detailedDescription: d.detailed_description || '',
                developers: d.developers || [],
                publishers: d.publishers || [],
                releaseDate: d.release_date?.date || 'Unknown',
                metacriticScore: d.metacritic?.score,
                metacriticUrl: d.metacritic?.url,
                pcRequirements: {
                    minimum: d.pc_requirements?.minimum,
                    recommended: d.pc_requirements?.recommended,
                },
                genres: d.genres?.map(g => g.description) || [],
                categories: d.categories?.map(c => c.description) || [],
            }

            const result = { success: true, details }
            detailsCache.set(appId, { data: result, fetchedAt: Date.now() })
            return result
        } catch (error) {
            console.error('[Main] Failed to fetch game details:', error)
            return {
                success: false,
                details: null,
                error: error instanceof Error ? error.message : 'Failed to fetch game details',
                errorCode: 'NETWORK_ERROR' as const,
            }
        }
    })
}
