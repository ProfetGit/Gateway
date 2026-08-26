import { describe, it, expect } from 'vitest'
import { heroArtSources, thumbArtSources, logoArtSources } from './hero-art-sources'
import type { Game } from '@/features/game-library/game-library-types'

function makeGame(overrides: Partial<Game> = {}): Game {
    return {
        id: 'g1',
        title: 'Test Game',
        isInstalled: false,
        isFavorite: false,
        source: 'steam',
        ...overrides,
    }
}

describe('heroArtSources', () => {
    // Black Ops II - Multiplayer (202990) has NO library art on the CDN — only
    // header.jpg. With a single hardcoded library_hero.jpg the banner rendered
    // a broken-image icon, which is the bug this list exists to prevent.
    it('offers a fallback after library_hero for a Steam game', () => {
        const sources = heroArtSources(makeGame({ steamAppId: '202990' }))
        expect(sources[0]).toContain('202990/library_hero.jpg')
        expect(sources.length).toBeGreaterThan(1)
        expect(sources.some((s) => s.includes('header.jpg'))).toBe(true)
    })

    it('includes mirrored local art, which is known-good', () => {
        const sources = heroArtSources(makeGame({ steamAppId: '1', localCoverPath: '1.jpg' }))
        expect(sources).toContain('gateway://cover/1.jpg')
    })

    it('falls back to coverUrl last', () => {
        const sources = heroArtSources(makeGame({ steamAppId: '1', coverUrl: 'https://cdn/c.jpg' }))
        expect(sources[sources.length - 1]).toBe('https://cdn/c.jpg')
    })

    it('uses an explicit heroImageUrl for a non-Steam game', () => {
        const sources = heroArtSources(
            makeGame({ source: 'heroic', heroImageUrl: 'https://epic/hero.png' })
        )
        expect(sources[0]).toBe('https://epic/hero.png')
    })

    it('returns an empty list when there is nothing to show', () => {
        expect(heroArtSources(makeGame({ source: 'manual' }))).toEqual([])
    })

    it('never yields undefined entries', () => {
        for (const source of heroArtSources(makeGame({ steamAppId: '1' }))) {
            expect(typeof source).toBe('string')
            expect(source.length).toBeGreaterThan(0)
        }
    })
})

describe('thumbArtSources', () => {
    it('prefers validated local art over a remote guess', () => {
        const sources = thumbArtSources(
            makeGame({ steamAppId: '1', localCoverPath: '1.jpg', coverUrl: 'https://cdn/c.jpg' })
        )
        expect(sources[0]).toBe('gateway://cover/1.jpg')
    })

    it('still offers CDN fallbacks when the stored coverUrl 404s', () => {
        const sources = thumbArtSources(makeGame({ steamAppId: '202990', coverUrl: 'https://dead/x.jpg' }))
        expect(sources.some((s) => s.includes('header.jpg'))).toBe(true)
    })
})

describe('logoArtSources', () => {
    it('offers the Steam logo first', () => {
        expect(logoArtSources(makeGame({ steamAppId: '440' }))[0]).toContain('440/logo.png')
    })

    // Empty means the hero falls back to rendering the title text.
    it('returns an empty list when no logo is knowable', () => {
        expect(logoArtSources(makeGame({ source: 'manual' }))).toEqual([])
    })
})

// A manually added game matched to a Steam entry carries metadataAppId and no
// steamAppId. It used to produce no art candidates at all — the reported
// "matched game still has no cover or banner".
describe('metadata-only matches', () => {
    const matched = makeGame({ metadataAppId: '1145360' })

    it('offers hero art from the matched appid', () => {
        expect(heroArtSources(matched)[0]).toContain('/1145360/library_hero.jpg')
    })

    it('offers thumb art from the matched appid', () => {
        expect(thumbArtSources(matched).some((s) => s.includes('/1145360/'))).toBe(true)
    })

    it('offers a logo from the matched appid', () => {
        expect(logoArtSources(matched)[0]).toContain('/1145360/logo.png')
    })

    it('still prefers an owned steamAppId when both are present', () => {
        const owned = makeGame({ steamAppId: '111', metadataAppId: '222' })
        expect(heroArtSources(owned)[0]).toContain('/111/')
    })
})
