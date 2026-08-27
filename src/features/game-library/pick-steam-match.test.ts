import { describe, expect, it } from 'vitest'
import { normaliseTitle, pickSteamMatch } from './pick-steam-match'
import type { SteamMatchHit } from './components/SteamMatchResults'

const hit = (name: string, appId = '1'): SteamMatchHit => ({ appId, name })

describe('normaliseTitle', () => {
    it('ignores punctuation, case and trademark marks', () => {
        expect(normaliseTitle('Hollow Knight: Silksong™')).toBe(normaliseTitle('hollow knight silksong'))
        expect(normaliseTitle('S.T.A.L.K.E.R. 2')).toBe('s t a l k e r 2')
    })

    it('spells out ampersands so both spellings agree', () => {
        expect(normaliseTitle('Rick & Morty')).toBe(normaliseTitle('Rick and Morty'))
    })
})

describe('pickSteamMatch', () => {
    it('auto-links an exact title, punctuation aside', () => {
        const hits = [hit('Hollow Knight: Silksong', '1030300'), hit('Hollow Knight', '367520')]
        const choice = pickSteamMatch('Hollow Knight Silksong', hits)
        expect(choice.exact?.appId).toBe('1030300')
        expect(choice.suggestions).toEqual([])
    })

    it('refuses to auto-link a near miss, and offers it instead', () => {
        const hits = [hit('SKALD: Against the Black Priory', '1069160'), hit('Skald Demo', '2')]
        const choice = pickSteamMatch('Skald', hits)
        expect(choice.exact).toBeNull()
        expect(choice.suggestions.map((h) => h.appId)).toEqual(['1069160', '2'])
    })

    it('does not link the first result just because it is first', () => {
        expect(pickSteamMatch('Doom', [hit('DOOM Eternal'), hit('DOOM 64')]).exact).toBeNull()
    })

    it('caps the suggestions it offers', () => {
        const hits = [hit('A', '1'), hit('B', '2'), hit('C', '3'), hit('D', '4')]
        expect(pickSteamMatch('Nothing alike', hits).suggestions).toHaveLength(3)
    })

    it('handles an empty catalogue response and an empty title', () => {
        expect(pickSteamMatch('Anything', [])).toEqual({ exact: null, suggestions: [] })
        expect(pickSteamMatch('', [hit('A')]).exact).toBeNull()
    })
})
