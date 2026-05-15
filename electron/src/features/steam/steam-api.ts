import { ipcMain } from 'electron'

// ═══════════════════════════════════════════════════════════
// Helper to fetch game details from Steam Store API
// ═══════════════════════════════════════════════════════════
export async function fetchSteamStoreDetails(appIds: string[]) {
    if (appIds.length === 0) return []

    const games: { appId: string; name: string; playtime: number; lastPlayed: undefined }[] = []

    // Fetch each app individually for reliability (Steam API can be finicky with batch requests)
    for (const appId of appIds) {
        try {
            const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`
            console.log('[Main] Fetching store details for:', appId)

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
                console.log('[Main] Got name for', appId, ':', data[appId].data.name)
                games.push({
                    appId: String(data[appId].data.steam_appid),
                    name: data[appId].data.name,
                    playtime: 0,
                    lastPlayed: undefined
                })
            } else {
                console.warn('[Main] No data for appId:', appId)
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
    const TRENDING_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

    let trendingRequest: Promise<{ success: boolean; data?: unknown; error?: string }> | null = null

    ipcMain.handle('get-trending-games', async () => {

        // Check cache

        if (trendingCache && Date.now() - trendingCache.fetchedAt < TRENDING_CACHE_TTL) {
            return { success: true, data: trendingCache.data }
        }

        if (trendingRequest) {
            return trendingRequest
        }

        trendingRequest = (async () => {
            try {
                // Fetch from Steam Store API (bypasses CORS in Electron main process)
                const response = await fetch('https://store.steampowered.com/api/featuredcategories?cc=us&l=en')

                if (!response.ok) {
                    throw new Error(`Steam API returned ${response.status}`)
                }

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
                    specials?: { items?: Array<unknown> }
                    new_releases?: { items?: Array<unknown> }
                }

                // Extract top sellers (primary trending source)
                const topSellers = rawData.top_sellers?.items || []

                // Hardware IDs to exclude (Steam Deck, controllers, accessories)
                const hardwareIds = new Set([
                    1675200,  // Steam Deck
                    1675180,  // Steam Deck Dock
                    353380,   // Steam Controller
                    530260,   // Steam Link
                    353370,   // Steam Link
                ])

                // Filter out hardware and non-game items
                const filteredItems = topSellers.filter(item => {
                    // Exclude known hardware IDs
                    if (hardwareIds.has(item.id)) return false

                    // Exclude items with hardware-like names
                    const nameLower = item.name.toLowerCase()
                    const hardwarePatterns = ['steam deck', 'controller', 'hardware', 'dock', 'steam link', 'valve index']
                    if (hardwarePatterns.some(pattern => nameLower.includes(pattern))) return false

                    return true
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

                const trendingData = {
                    games,
                    fetchedAt: Date.now(),
                    source: 'top_sellers' as const,
                }

                // Cache the result
                trendingCache = { data: trendingData, fetchedAt: Date.now() }

                console.log('[Main] ✓ Fetched', games.length, 'trending games from Steam')
                return { success: true, data: trendingData }

            } catch (error) {
                console.error('[Main] Failed to fetch trending games:', error)
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch trending games'
                }
            } finally {
                trendingRequest = null
            }
        })()

        return trendingRequest
    })

    // ═══════════════════════════════════════════════════════════
    // Free Deals (GamerPower API - Steam giveaways)
    // ═══════════════════════════════════════════════════════════

    let freeDealsCache: { data: unknown; fetchedAt: number } | null = null
    const FREE_DEALS_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

    let freeDealsRequest: Promise<{ success: boolean; data?: unknown; error?: string }> | null = null

    ipcMain.handle('get-free-deals', async () => {

        // Check cache

        if (freeDealsCache && Date.now() - freeDealsCache.fetchedAt < FREE_DEALS_CACHE_TTL) {
            return { success: true, data: freeDealsCache.data }
        }

        if (freeDealsRequest) {
            return freeDealsRequest
        }

        freeDealsRequest = (async () => {
            try {
                // GamerPower API: Steam platform, game type only (not DLC/loot)
                const response = await fetch(
                    'https://www.gamerpower.com/api/giveaways?platform=steam&type=game'
                )

                if (!response.ok) {
                    throw new Error(`GamerPower API returned ${response.status}`)
                }

                const rawGiveaways = await response.json() as Array<{
                    id: number
                    title: string
                    worth: string
                    thumbnail: string
                    image: string
                    description: string
                    open_giveaway_url: string
                    published_date: string
                    end_date: string
                    platforms: string
                    status: string
                }>

                // Helper to search Steam for App ID
                const searchSteamAppId = async (gameName: string): Promise<string | null> => {
                    try {
                        const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=en&cc=US`
                        const searchRes = await fetch(searchUrl)
                        if (!searchRes.ok) return null

                        const searchData = await searchRes.json() as {
                            items?: Array<{ id: number; name: string }>
                        }

                        if (searchData.items && searchData.items.length > 0) {
                            // Find best match (case-insensitive)
                            const exactMatch = searchData.items.find(
                                item => item.name.toLowerCase() === gameName.toLowerCase()
                            )
                            return String(exactMatch?.id || searchData.items[0].id)
                        }
                        return null
                    } catch {
                        return null
                    }
                }


                // Map to our expected format and fetch Steam App IDs
                const dealsWithAppIds = await Promise.all(
                    rawGiveaways.slice(0, 12).map(async (giveaway) => {
                        const cleanTitle = giveaway.title.replace(/ \(Steam\) Giveaway$/i, '')
                        const steamAppId = await searchSteamAppId(cleanTitle)

                        return {
                            id: giveaway.id,
                            title: cleanTitle,
                            originalPrice: giveaway.worth,
                            thumbnail: giveaway.thumbnail,
                            image: giveaway.image,
                            description: giveaway.description,
                            claimUrl: giveaway.open_giveaway_url,
                            endDate: giveaway.end_date,
                            status: giveaway.status,
                            steamAppId, // New field: Steam App ID for opening in Steam app
                        }
                    })
                )

                const freeDealsData = {
                    deals: dealsWithAppIds,
                    fetchedAt: Date.now(),
                }

                // Cache the result
                freeDealsCache = { data: freeDealsData, fetchedAt: Date.now() }

                console.log('[Main] ✓ Fetched', dealsWithAppIds.length, 'free Steam giveaways from GamerPower')
                return { success: true, data: freeDealsData }

            } catch (error) {
                console.error('[Main] Failed to fetch free deals:', error)
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch free deals'
                }
            } finally {
                freeDealsRequest = null
            }
        })()

        return freeDealsRequest
    })

    // ═══════════════════════════════════════════════════════════
    // Game News / Patch Notes
    // ═══════════════════════════════════════════════════════════

    const newsCache = new Map<string, { data: unknown; fetchedAt: number }>()
    const NEWS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

    ipcMain.handle('get-game-news', async (_event, appId: string, count: number = 10) => {
        console.log('[Main] get-game-news called for appId:', appId)

        if (!appId) {
            return {
                success: false,
                news: [],
                totalCount: 0,
                error: 'No Steam App ID provided',
                errorCode: 'NO_STEAM_APP' as const,
            }
        }

        // Check cache
        const cached = newsCache.get(appId)
        if (cached && Date.now() - cached.fetchedAt < NEWS_CACHE_TTL) {
            return cached.data
        }

        try {
            // Steam ISteamNews/GetNewsForApp API (no API key required)
            // Filter to steam_community_announcements to avoid regional third-party news sites
            const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=${count}&maxlength=0&format=json&feeds=steam_community_announcements`
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error(`Steam API returned ${response.status}`)
            }

            const data = await response.json() as {
                appnews?: {
                    appid: number
                    newsitems: Array<{
                        gid: string
                        title: string
                        url: string
                        is_external_url: boolean
                        author: string
                        contents: string
                        feedlabel: string
                        feedname: string
                        date: number
                        tags?: string[]
                    }>
                    count: number
                }
            }

            if (!data.appnews || !data.appnews.newsitems) {
                return {
                    success: true,
                    news: [],
                    totalCount: 0,
                }
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

            const result = {
                success: true,
                news,
                totalCount: data.appnews.count,
            }

            // Cache the result
            newsCache.set(appId, { data: result, fetchedAt: Date.now() })
            console.log('[Main] ✓ Fetched', news.length, 'news items for appId:', appId)

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
    const DETAILS_CACHE_TTL = 30 * 60 * 1000 // 30 minutes (details don't change often)

    ipcMain.handle('get-game-details', async (_event, appId: string) => {
        console.log('[Main] get-game-details called for appId:', appId)

        if (!appId) {
            return {
                success: false,
                details: null,
                error: 'No Steam App ID provided',
                errorCode: 'NO_STEAM_APP' as const,
            }
        }

        // Check cache
        const cached = detailsCache.get(appId)
        if (cached && Date.now() - cached.fetchedAt < DETAILS_CACHE_TTL) {
            return cached.data
        }

        try {
            // Steam Store appdetails API (no API key required)
            const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=en`
            const response = await fetch(url)

            if (!response.ok) {
                throw new Error(`Steam Store API returned ${response.status}`)
            }

            const data = await response.json() as {
                [key: string]: {
                    success: boolean
                    data?: {
                        type: string
                        name: string
                        steam_appid: number
                        short_description: string
                        detailed_description: string
                        developers?: string[]
                        publishers?: string[]
                        release_date?: {
                            coming_soon: boolean
                            date: string
                        }
                        metacritic?: {
                            score: number
                            url: string
                        }
                        pc_requirements?: {
                            minimum?: string
                            recommended?: string
                        }
                        genres?: Array<{ id: string; description: string }>
                        categories?: Array<{ id: number; description: string }>
                    }
                }
            }

            const appData = data[appId]
            if (!appData?.success || !appData.data) {
                return {
                    success: false,
                    details: null,
                    error: 'Game details not found',
                    errorCode: 'API_ERROR' as const,
                }
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

            const result = {
                success: true,
                details,
            }

            // Cache the result
            detailsCache.set(appId, { data: result, fetchedAt: Date.now() })
            console.log('[Main] ✓ Fetched details for:', d.name)

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
