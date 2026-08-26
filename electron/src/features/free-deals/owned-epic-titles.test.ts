import { describe, it, expect } from 'vitest'
import { normalizeEpicTitle, ownedEpicTitles, isEpicTitleOwned } from './owned-epic-titles'
import type { Game } from '../../shared/types'

function makeGame(overrides: Partial<Game>): Game {
    return {
        id: 'g1',
        title: 'A Game',
        isInstalled: true,
        isFavorite: false,
        source: 'heroic',
        heroicRunner: 'legendary',
        ...overrides,
    }
}

describe('normalizeEpicTitle', () => {
    it('ignores case, punctuation and spacing', () => {
        expect(normalizeEpicTitle("Them's Fightin' Herds"))
            .toBe(normalizeEpicTitle('Thems  Fightin Herds'))
        expect(normalizeEpicTitle('LISA: The Definitive Edition'))
            .toBe(normalizeEpicTitle('lisa the definitive edition'))
    })

    // Epic advertises the giveaway with an edition suffix that the granted
    // entitlement often lacks, so the two would otherwise never match.
    it.each([
        ['Cardpocalypse Standard Edition', 'Cardpocalypse'],
        ['Model Builder: Complete Edition', 'Model Builder'],
        ['Rival Stars Horse Racing - Desktop Edition', 'Rival Stars Horse Racing'],
        ['Some Game Game of the Year Edition', 'Some Game'],
    ])('strips the edition suffix from %s', (advertised, granted) => {
        expect(normalizeEpicTitle(advertised)).toBe(normalizeEpicTitle(granted))
    })

    it('only strips a suffix at the end, never mid-title', () => {
        expect(normalizeEpicTitle('Standard Edition Simulator'))
            .toBe('standardeditionsimulator')
    })

    it('keeps distinct games distinct', () => {
        expect(normalizeEpicTitle('Ghostrunner')).not.toBe(normalizeEpicTitle('Ghostrunner 2'))
        expect(normalizeEpicTitle('Portal')).not.toBe(normalizeEpicTitle('Portal 2'))
    })

    it('returns an empty string for a title with nothing alphanumeric in it', () => {
        expect(normalizeEpicTitle('  ---  ')).toBe('')
    })
})

describe('ownedEpicTitles', () => {
    it('collects only legendary-runner rows', () => {
        const owned = ownedEpicTitles([
            makeGame({ title: 'Mortal Shell' }),
            makeGame({ title: 'Gwent', heroicRunner: 'gog' }),
            makeGame({ title: 'Half-Life', source: 'steam', heroicRunner: undefined }),
            makeGame({ title: 'Some Shortcut', source: 'shortcut', heroicRunner: undefined }),
        ])
        expect([...owned]).toEqual(['mortalshell'])
    })

    it('is empty when nothing has been imported from Heroic', () => {
        expect(ownedEpicTitles([]).size).toBe(0)
    })
})

describe('isEpicTitleOwned', () => {
    const owned = ownedEpicTitles([
        makeGame({ title: 'Cardpocalypse' }),
        makeGame({ title: "Them's Fightin' Herds" }),
    ])

    it('matches across the edition-suffix and punctuation differences', () => {
        expect(isEpicTitleOwned('Cardpocalypse Standard Edition', owned)).toBe(true)
        expect(isEpicTitleOwned('Thems Fightin Herds', owned)).toBe(true)
    })

    it('does not match an unowned game', () => {
        expect(isEpicTitleOwned('Breathedge', owned)).toBe(false)
    })

    // A false positive greys out a game the user could still claim for free,
    // which is a worse outcome than showing no badge at all.
    it('does not match on a shared prefix', () => {
        expect(isEpicTitleOwned('Cardpocalypse 2', owned)).toBe(false)
        expect(isEpicTitleOwned('Card', owned)).toBe(false)
    })

    it('never matches an empty title', () => {
        expect(isEpicTitleOwned('', owned)).toBe(false)
        expect(isEpicTitleOwned('!!!', owned)).toBe(false)
    })
})
