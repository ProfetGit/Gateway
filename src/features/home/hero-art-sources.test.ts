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
