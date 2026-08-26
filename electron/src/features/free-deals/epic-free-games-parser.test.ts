import { describe, it, expect } from 'vitest'
import { parseEpicFreeGames, resolveEpicStoreUrl, pickEpicImage } from './epic-free-games-parser'

// Shapes below are trimmed copies of real freeGamesPromotions responses.

const NOW = new Date('2026-08-22T12:00:00.000Z')

function makeElement(overrides: Record<string, unknown> = {}) {
    return {
        id: 'b467b7d3570e44c0b84e59475f4a5636',
        title: 'Cardpocalypse',
        description: 'A card game.',
        status: 'ACTIVE',
        productSlug: 'cardpocalypse/home',
        urlSlug: 'cardpocalypsegeneralaudience',
        offerMappings: [{ pageSlug: 'cardpocalypse', pageType: 'productHome' }],
        catalogNs: { mappings: [{ pageSlug: 'cardpocalypse', pageType: 'productHome' }] },
        keyImages: [
            { type: 'OfferImageTall', url: 'https://cdn1.epicgames.com/tall.jpg' },
            { type: 'OfferImageWide', url: 'https://cdn1.epicgames.com/wide.jpg' },
        ],
        price: {
            totalPrice: {
                discountPrice: 0,
                originalPrice: 2499,
                fmtPrice: { originalPrice: '$24.99' },
            },
        },
        promotions: {
            promotionalOffers: [{
                promotionalOffers: [{
                    startDate: '2026-08-20T15:00:00.000Z',
                    endDate: '2026-08-27T15:00:00.000Z',
                    discountSetting: { discountType: 'PERCENTAGE', discountPercentage: 0 },
                }],
            }],
            upcomingPromotionalOffers: [],
        },
        ...overrides,
    }
}

function wrap(elements: unknown[]) {
    return { data: { Catalog: { searchStore: { elements } } } }
}

describe('parseEpicFreeGames', () => {
    it('maps a currently-free game', () => {
        const games = parseEpicFreeGames(wrap([makeElement()]), NOW)
        expect(games).toEqual([{
            id: 'b467b7d3570e44c0b84e59475f4a5636',
            title: 'Cardpocalypse',
            description: 'A card game.',
            originalPrice: '$24.99',
            thumbnail: 'https://cdn1.epicgames.com/tall.jpg',
            image: 'https://cdn1.epicgames.com/wide.jpg',
            storeUrl: 'https://store.epicgames.com/en-US/p/cardpocalypse',
            endDate: '2026-08-27T15:00:00.000Z',
        }])
    })

    // The single most important rule here: next week's giveaway sits in the
    // same payload and must not be offered as claimable today.
    it('skips a giveaway that has not started yet', () => {
        const upcoming = makeElement({
            promotions: {
                promotionalOffers: [],
                upcomingPromotionalOffers: [{
                    promotionalOffers: [{
                        startDate: '2026-08-27T15:00:00.000Z',
                        endDate: '2026-09-03T15:00:00.000Z',
                        discountSetting: { discountPercentage: 0 },
                    }],
                }],
            },
        })
        expect(parseEpicFreeGames(wrap([upcoming]), NOW)).toEqual([])
    })

    it('skips a giveaway whose window has already closed', () => {
        const lapsed = makeElement({
            promotions: {
                promotionalOffers: [{
                    promotionalOffers: [{
                        startDate: '2026-08-06T15:00:00.000Z',
                        endDate: '2026-08-13T15:00:00.000Z',
                        discountSetting: { discountPercentage: 0 },
                    }],
                }],
            },
        })
        expect(parseEpicFreeGames(wrap([lapsed]), NOW)).toEqual([])
    })

    it('treats the offer window as half-open — the end instant is already over', () => {
        const endsNow = makeElement({
            promotions: {
                promotionalOffers: [{
                    promotionalOffers: [{
                        startDate: '2026-08-20T15:00:00.000Z',
                        endDate: NOW.toISOString(),
                        discountSetting: { discountPercentage: 0 },
                    }],
                }],
            },
        })
        expect(parseEpicFreeGames(wrap([endsNow]), NOW)).toEqual([])
    })

    // Epic's discountPercentage is the share of the price still owed, so a
    // "20%" entry is a paid sale. Reading it as 20%-off would put paid games
    // in a section titled "Free to Keep".
    it('skips a discounted-but-not-free promotion', () => {
        const sale = makeElement({
            price: { totalPrice: { discountPrice: 1999, fmtPrice: { originalPrice: '$24.99' } } },
            promotions: {
                promotionalOffers: [{
                    promotionalOffers: [{
                        startDate: '2026-08-20T15:00:00.000Z',
                        endDate: '2026-08-27T15:00:00.000Z',
                        discountSetting: { discountPercentage: 20 },
                    }],
                }],
            },
        })
        expect(parseEpicFreeGames(wrap([sale]), NOW)).toEqual([])
    })

    it('falls back to the discount percentage when there is no price block', () => {
        const noPrice = makeElement({ price: undefined })
        expect(parseEpicFreeGames(wrap([noPrice]), NOW)).toHaveLength(1)

        const noPricePaid = makeElement({
            price: undefined,
            promotions: {
                promotionalOffers: [{
                    promotionalOffers: [{
                        startDate: '2026-08-20T15:00:00.000Z',
                        endDate: '2026-08-27T15:00:00.000Z',
                        discountSetting: { discountPercentage: 50 },
                    }],
                }],
            },
        })
        expect(parseEpicFreeGames(wrap([noPricePaid]), NOW)).toEqual([])
    })

    it('skips non-active entries', () => {
        expect(parseEpicFreeGames(wrap([makeElement({ status: 'SUNSET' })]), NOW)).toEqual([])
    })

    it('skips entries with no resolvable store page', () => {
        const unlinkable = makeElement({
            offerMappings: [],
            catalogNs: { mappings: [] },
            productSlug: null,
            urlSlug: '3f18c54a6e00424ba6e8f4422167cac7',
        })
        expect(parseEpicFreeGames(wrap([unlinkable]), NOW)).toEqual([])
    })

    it('skips entries with no usable artwork', () => {
        expect(parseEpicFreeGames(wrap([makeElement({ keyImages: [] })]), NOW)).toEqual([])
    })

    it('keeps a free entry that is missing a price label', () => {
        const noFmt = makeElement({ price: { totalPrice: { discountPrice: 0 } } })
        expect(parseEpicFreeGames(wrap([noFmt]), NOW)[0]?.originalPrice).toBe('')
    })

    // Real payload: "Epic Mage Bundle" reports originalPrice "0". Struck
    // through beside the word FREE that looks like a bug on the card.
    it.each(['0', '0.00', '$0.00', '€0,00'])('drops a zero price label (%s)', (label) => {
        const zeroPrice = makeElement({
            price: { totalPrice: { discountPrice: 0, fmtPrice: { originalPrice: label } } },
        })
        expect(parseEpicFreeGames(wrap([zeroPrice]), NOW)[0]?.originalPrice).toBe('')
    })

    it('keeps a real price label intact', () => {
        expect(parseEpicFreeGames(wrap([makeElement()]), NOW)[0]?.originalPrice).toBe('$24.99')
    })

    it.each([
        ['null', null],
        ['a string', 'nope'],
        ['an empty object', {}],
        ['a missing elements array', { data: { Catalog: { searchStore: {} } } }],
        ['elements as an object', { data: { Catalog: { searchStore: { elements: {} } } } }],
    ])('returns [] for %s rather than throwing', (_label, payload) => {
        expect(parseEpicFreeGames(payload, NOW)).toEqual([])
    })

    it('drops junk entries without losing the good ones around them', () => {
        const games = parseEpicFreeGames(
            wrap([null, 'nonsense', makeElement(), { title: 'No id' }]),
            NOW
        )
        expect(games.map(g => g.title)).toEqual(['Cardpocalypse'])
    })
})

describe('resolveEpicStoreUrl', () => {
    // A bundle's offerMappings points at the specific offer page while
    // catalogNs only reaches the parent product, so the order matters.
    it('prefers offerMappings over catalogNs', () => {
        expect(resolveEpicStoreUrl({
            offerMappings: [{ pageSlug: 'albion-online-epic-mage-bundle-2ceb19', pageType: 'offer' }],
            catalogNs: { mappings: [{ pageSlug: 'albion-online-7eb24d' }] },
        })).toBe('https://store.epicgames.com/en-US/p/albion-online-epic-mage-bundle-2ceb19')
    })

    it('falls back to catalogNs, then productSlug, then urlSlug', () => {
        expect(resolveEpicStoreUrl({ catalogNs: { mappings: [{ pageSlug: 'breathedge' }] } }))
            .toBe('https://store.epicgames.com/en-US/p/breathedge')
        expect(resolveEpicStoreUrl({ productSlug: 'thems-fightin-herds/home' }))
            .toBe('https://store.epicgames.com/en-US/p/thems-fightin-herds')
        expect(resolveEpicStoreUrl({ urlSlug: 'monument-valley-02' }))
            .toBe('https://store.epicgames.com/en-US/p/monument-valley-02')
    })

    it('rejects a bare hex id, which is an internal key and not a page', () => {
        expect(resolveEpicStoreUrl({ urlSlug: '3f18c54a6e00424ba6e8f4422167cac7' })).toBeNull()
    })

    it('returns null when nothing is available', () => {
        expect(resolveEpicStoreUrl({})).toBeNull()
        expect(resolveEpicStoreUrl(null)).toBeNull()
    })
})

describe('pickEpicImage', () => {
    const images = [
        { type: 'Thumbnail', url: 'https://cdn/thumb.jpg' },
        { type: 'OfferImageWide', url: 'https://cdn/wide.jpg' },
    ]

    it('honours the preference order rather than document order', () => {
        expect(pickEpicImage(images, ['OfferImageWide', 'Thumbnail'])).toBe('https://cdn/wide.jpg')
        expect(pickEpicImage(images, ['Thumbnail', 'OfferImageWide'])).toBe('https://cdn/thumb.jpg')
    })

    it('falls back to any http image when no preferred type matches', () => {
        expect(pickEpicImage(images, ['DoesNotExist'])).toBe('https://cdn/thumb.jpg')
    })

    // These entries carry a com.epicgames.video:// url that no <img> can render.
    it('never returns a video entry', () => {
        const videoOnly = [{ type: 'heroCarouselVideo', url: 'com.epicgames.video.qs://abc' }]
        expect(pickEpicImage(videoOnly, ['OfferImageWide'])).toBeNull()
    })

    it('returns null for a missing or empty list', () => {
        expect(pickEpicImage(undefined, ['OfferImageWide'])).toBeNull()
        expect(pickEpicImage([], ['OfferImageWide'])).toBeNull()
    })
})
