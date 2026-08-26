// ═══════════════════════════════════════════════════════════
// Epic Games Store — free-games promotion parser
// ═══════════════════════════════════════════════════════════
//
// Pure: takes the already-decoded freeGamesPromotions payload and returns
// only the titles that are free RIGHT NOW. Kept free of fetch/fs so the
// filtering rules — which are the whole difficulty here — are testable.
//
// The endpoint returns roughly a dozen elements, but most of them are NOT
// currently free. Three separate things have to line up:
//
//   1. `promotions.promotionalOffers` (current) vs `upcomingPromotionalOffers`
//      (next week's, and the week after). Only the former counts.
//   2. The offer's [startDate, endDate] window must contain `now`. Epic leaves
//      finished offers in the payload for a while after they lapse.
//   3. The offer must actually be a giveaway, not a sale. Epic's
//      `discountPercentage` is the percentage of the price you still PAY —
//      0 means free, 20 means 80% off. That reads backwards, so the
//      authoritative signal used here is `price.totalPrice.discountPrice === 0`
//      with the percentage only as a fallback when price data is missing.

export interface EpicFreeGame {
    id: string
    title: string
    description: string
    originalPrice: string
    thumbnail: string
    image: string
    storeUrl: string
    endDate: string
}

const EPIC_STORE_BASE = 'https://store.epicgames.com/en-US/p/'

/** Wide 16:9 art for the 460:215 StoreCard banner, tall art as the fallback. */
const BANNER_IMAGE_TYPES = ['OfferImageWide', 'DieselStoreFrontWide', 'VaultClosed', 'Thumbnail']
const THUMB_IMAGE_TYPES = ['OfferImageTall', 'DieselStoreFrontTall', 'Thumbnail']

interface RawKeyImage { type?: unknown; url?: unknown }
interface RawOffer { startDate?: unknown; endDate?: unknown; discountSetting?: { discountPercentage?: unknown } }
interface RawElement {
    id?: unknown
    title?: unknown
    description?: unknown
    status?: unknown
    productSlug?: unknown
    urlSlug?: unknown
    offerMappings?: unknown
    catalogNs?: { mappings?: unknown }
    keyImages?: unknown
    price?: { totalPrice?: { discountPrice?: unknown; fmtPrice?: { originalPrice?: unknown } } }
    promotions?: { promotionalOffers?: unknown } | null
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function asString(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 ? value : null
}

/**
 * Epic reports a zero original price as the bare string "0" for items that
 * never had a standalone price — in-game bundles, mostly. Struck through next
 * to the word FREE that reads as a rendering fault, so it is dropped and the
 * card just omits the "was" price.
 */
function asPriceLabel(value: unknown): string {
    const label = asString(value)
    if (!label) return ''
    return /^[^0-9]*0([.,]0+)?$/.test(label) ? '' : label
}

/**
 * Epic exposes the storefront path in four places of decreasing precision, and
 * none of them is reliably present. `offerMappings` is preferred because for a
 * bundle or add-on it points at the specific offer page ("Epic Mage Bundle" →
 * albion-online-epic-mage-bundle-…) while `catalogNs` only reaches the parent
 * product. `urlSlug` is last because it is sometimes a bare hex id, which
 * resolves to nothing.
 */
export function resolveEpicStoreUrl(element: unknown): string | null {
    if (!isRecord(element)) return null
    const el = element as RawElement

    const fromMapping = (mappings: unknown): string | null => {
        if (!Array.isArray(mappings)) return null
        for (const mapping of mappings) {
            if (!isRecord(mapping)) continue
            const slug = asString(mapping.pageSlug)
            if (slug) return slug
        }
        return null
    }

    const slug =
        fromMapping(el.offerMappings) ??
        fromMapping(el.catalogNs?.mappings) ??
        // "cardpocalypse/home" — only the first segment is the store path.
        asString(el.productSlug)?.split('/')[0] ??
        asString(el.urlSlug)

    if (!slug) return null
    // A 32-char hex urlSlug is an internal id, not a page. Better no link than
    // a link to a 404.
    if (/^[0-9a-f]{32}$/i.test(slug)) return null
    return `${EPIC_STORE_BASE}${slug}`
}

/** First image whose `type` matches one of `preferred`, else the first image at all. */
export function pickEpicImage(keyImages: unknown, preferred: string[]): string | null {
    if (!Array.isArray(keyImages)) return null
    const images = keyImages.filter(isRecord) as RawKeyImage[]

    for (const type of preferred) {
        const hit = images.find((image) => image.type === type && asString(image.url))
        if (hit) return asString(hit.url)
    }
    // Skip the video entries — their "url" is a com.epicgames.video:// scheme.
    const anyImage = images.find((image) => asString(image.url)?.startsWith('http'))
    return anyImage ? asString(anyImage.url) : null
}

/**
 * The currently-running promotional window, or null. Only
 * `promotions.promotionalOffers` is considered — `upcomingPromotionalOffers`
 * holds next week's giveaway, which must not be shown as claimable today.
 */
function findActiveOffer(element: RawElement, now: Date): RawOffer | null {
    const groups = element.promotions?.promotionalOffers
    if (!Array.isArray(groups)) return null

    for (const group of groups) {
        if (!isRecord(group) || !Array.isArray(group.promotionalOffers)) continue
        for (const offer of group.promotionalOffers) {
            if (!isRecord(offer)) continue
            const start = asString(offer.startDate)
            const end = asString(offer.endDate)
            if (!start || !end) continue

            const startMs = Date.parse(start)
            const endMs = Date.parse(end)
            if (Number.isNaN(startMs) || Number.isNaN(endMs)) continue
            if (now.getTime() < startMs || now.getTime() >= endMs) continue

            return offer as RawOffer
        }
    }
    return null
}

/** True when the offer makes the title cost nothing (not merely discounted). */
function isGiveaway(element: RawElement, offer: RawOffer): boolean {
    const discountPrice = element.price?.totalPrice?.discountPrice
    if (typeof discountPrice === 'number') return discountPrice === 0

    // No price block — fall back to the percentage, remembering that Epic's
    // number is the share of the price still owed.
    const percentage = offer.discountSetting?.discountPercentage
    return percentage === 0
}

export function parseEpicFreeGames(raw: unknown, now: Date = new Date()): EpicFreeGame[] {
    if (!isRecord(raw)) return []

    const elements = (raw as { data?: { Catalog?: { searchStore?: { elements?: unknown } } } })
        .data?.Catalog?.searchStore?.elements
    if (!Array.isArray(elements)) return []

    const games: EpicFreeGame[] = []

    for (const element of elements) {
        if (!isRecord(element)) continue
        const el = element as RawElement

        if (el.status !== undefined && el.status !== 'ACTIVE') continue

        const title = asString(el.title)
        const id = asString(el.id)
        if (!title || !id) continue

        const offer = findActiveOffer(el, now)
        if (!offer || !isGiveaway(el, offer)) continue

        const storeUrl = resolveEpicStoreUrl(el)
        if (!storeUrl) continue

        const image = pickEpicImage(el.keyImages, BANNER_IMAGE_TYPES)
        if (!image) continue

        games.push({
            id,
            title,
            description: asString(el.description) ?? '',
            originalPrice: asPriceLabel(el.price?.totalPrice?.fmtPrice?.originalPrice),
            thumbnail: pickEpicImage(el.keyImages, THUMB_IMAGE_TYPES) ?? image,
            image,
            storeUrl,
            endDate: asString(offer.endDate) ?? '',
        })
    }

    return games
}
