import { ipcMain } from 'electron'
import { JsonStore } from '../../shared/store'
import { fetchGamerPowerSteamDeals } from './gamerpower-deals'
import { fetchEpicFreeGames } from './epic-free-games'
import { ownedEpicTitles, isEpicTitleOwned } from './owned-epic-titles'

// ═══════════════════════════════════════════════════════════
// Free to Keep — Steam giveaways (GamerPower) + Epic weekly free games
// ═══════════════════════════════════════════════════════════

const CACHE_TTL = 10 * 60 * 1000

export interface FreeDeal {
    id: string
    title: string
    originalPrice: string
    thumbnail: string
    image: string
    description: string
    claimUrl: string
    endDate: string
    status: string
    steamAppId: string | null
    store: 'steam' | 'epic'
    alreadyOwned: boolean
}

interface FreeDealsData {
    deals: FreeDeal[]
    fetchedAt: number
}

type FreeDealsResult = { success: boolean; data?: FreeDealsData; error?: string }

/**
 * Soonest-expiring first, so the row leads with whatever the user is closest to
 * missing. Deals with no usable end date (GamerPower reports a literal "N/A"
 * for key giveaways that run until the keys run out) sort last rather than
 * being dropped — they are still claimable.
 */
function byUrgency(a: FreeDeal, b: FreeDeal): number {
    const aEnd = Date.parse(a.endDate)
    const bEnd = Date.parse(b.endDate)
    const aValid = !Number.isNaN(aEnd)
    const bValid = !Number.isNaN(bEnd)
    if (aValid && bValid) return aEnd - bEnd
    if (aValid) return -1
    if (bValid) return 1
    return 0
}

export function setupFreeDealsHandlers(store: JsonStore) {
    let cache: { data: FreeDealsData; fetchedAt: number } | null = null
    let inFlight: Promise<FreeDealsResult> | null = null

    ipcMain.handle('get_free_deals', async (): Promise<FreeDealsResult> => {
        if (cache && Date.now() - cache.fetchedAt < CACHE_TTL) {
            return { success: true, data: cache.data }
        }
        if (inFlight) return inFlight

        inFlight = (async (): Promise<FreeDealsResult> => {
            try {
                // allSettled, not all: one storefront being down or rate-limiting
                // must not blank out the other's giveaways.
                const [steamResult, epicResult] = await Promise.allSettled([
                    fetchGamerPowerSteamDeals(),
                    fetchEpicFreeGames(),
                ])

                if (steamResult.status === 'rejected') {
                    console.warn('[FreeDeals] Steam giveaways unavailable:', steamResult.reason)
                }
                if (epicResult.status === 'rejected') {
                    console.warn('[FreeDeals] Epic free games unavailable:', epicResult.reason)
                }

                if (steamResult.status === 'rejected' && epicResult.status === 'rejected') {
                    throw steamResult.reason
                }

                const steamDeals: FreeDeal[] = steamResult.status === 'fulfilled'
                    ? steamResult.value.map((deal) => ({
                        ...deal,
                        // GamerPower ids are numeric and Epic's are hex, so they
                        // could never collide — but the renderer keys on this and
                        // a source prefix keeps that guarantee explicit.
                        id: `steam:${deal.id}`,
                        status: 'Active',
                        store: 'steam' as const,
                        // Steam ownership is resolved in the renderer, which can
                        // re-check it live after the user comes back from claiming.
                        alreadyOwned: false,
                    }))
                    : []

                // Epic has no ownership API Gateway can reach, so the best
                // available answer is the entitlement list Heroic already
                // imported. Absent a Heroic import this is simply empty.
                const owned = ownedEpicTitles(store.get('games'))

                const epicDeals: FreeDeal[] = epicResult.status === 'fulfilled'
                    ? epicResult.value.map((game) => ({
                        id: `epic:${game.id}`,
                        title: game.title,
                        originalPrice: game.originalPrice,
                        thumbnail: game.thumbnail,
                        image: game.image,
                        description: game.description,
                        claimUrl: game.storeUrl,
                        endDate: game.endDate,
                        status: 'Active',
                        steamAppId: null,
                        store: 'epic' as const,
                        alreadyOwned: isEpicTitleOwned(game.title, owned),
                    }))
                    : []

                const deals = [...steamDeals, ...epicDeals].sort(byUrgency)
                const data = { deals, fetchedAt: Date.now() }
                cache = { data, fetchedAt: Date.now() }
                console.log(
                    `[FreeDeals] ✓ ${deals.length} deals (${steamDeals.length} Steam, ${epicDeals.length} Epic)`
                )
                return { success: true, data }
            } catch (error) {
                console.error('[FreeDeals] Failed to fetch free deals:', error)
                return {
                    success: false,
                    error: error instanceof Error ? error.message : 'Failed to fetch free deals',
                }
            } finally {
                inFlight = null
            }
        })()

        return inFlight
    })
}
