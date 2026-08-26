// ═══════════════════════════════════════════════════════════
// GamerPower — Steam giveaways
// ═══════════════════════════════════════════════════════════
//
// Moved here verbatim from steam-api.ts when the Epic source landed: the
// handler now merges two storefronts, so it no longer belongs to the Steam
// domain. Behaviour is unchanged.

const REQUEST_TIMEOUT_MS = 15_000

export interface GamerPowerDeal {
    id: number
    title: string
    originalPrice: string
    thumbnail: string
    image: string
    description: string
    claimUrl: string
    endDate: string
    steamAppId: string | null
}

interface RawGiveaway {
    id: number
    title: string
    worth: string
    thumbnail: string
    image: string
    description: string
    open_giveaway_url: string
    end_date: string
    status: string
}

/**
 * GamerPower gives a title but no appId, and the Steam app is what the claim
 * flow and the ownership check both key off. Best-effort: an exact name match
 * wins, otherwise the top hit.
 */
async function searchSteamAppId(gameName: string): Promise<string | null> {
    try {
        const searchUrl = `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(gameName)}&l=en&cc=US`
        const searchRes = await fetch(searchUrl, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) })
        if (!searchRes.ok) return null
        const searchData = await searchRes.json() as { items?: Array<{ id: number; name: string }> }
        if (searchData.items && searchData.items.length > 0) {
            const exactMatch = searchData.items.find(
                item => item.name.toLowerCase() === gameName.toLowerCase()
            )
            const id = exactMatch?.id ?? searchData.items[0]?.id
            return id === undefined ? null : String(id)
        }
        return null
    } catch {
        return null
    }
}

export async function fetchGamerPowerSteamDeals(): Promise<GamerPowerDeal[]> {
    const response = await fetch('https://www.gamerpower.com/api/giveaways?platform=steam&type=game', {
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) throw new Error(`GamerPower API returned ${response.status}`)

    const rawGiveaways = await response.json() as RawGiveaway[]
    if (!Array.isArray(rawGiveaways)) return []

    return Promise.all(
        rawGiveaways.slice(0, 12).map(async (giveaway) => {
            const cleanTitle = giveaway.title.replace(/ \(Steam\) Giveaway$/i, '')
            return {
                id: giveaway.id,
                title: cleanTitle,
                originalPrice: giveaway.worth,
                thumbnail: giveaway.thumbnail,
                image: giveaway.image,
                description: giveaway.description,
                claimUrl: giveaway.open_giveaway_url,
                endDate: giveaway.end_date,
                steamAppId: await searchSteamAppId(cleanTitle),
            }
        })
    )
}
