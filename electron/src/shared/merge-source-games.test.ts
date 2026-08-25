import { describe, it, expect } from 'vitest'
import { mergeSourceGames, type IncomingGame } from './merge-source-games'
import type { Game } from './types'

function makeGame(overrides: Partial<Game> & { id: string }): Game {
    return {
        title: 'Game',
        isInstalled: true,
        isFavorite: false,
        source: 'lutris',
        ...overrides,
    }
}

function incoming(key: string, fields: Partial<Omit<Game, 'id'>> = {}): IncomingGame {
    return {
        key,
        fields: {
            title: 'Game',
            isInstalled: true,
            isFavorite: false,
            source: 'lutris',
            lutrisSlug: key,
            ...fields,
        },
    }
}

const byLutrisSlug = (g: Game) => g.lutrisSlug
let counter = 0
const makeId = () => `new-${counter++}`

describe('mergeSourceGames', () => {
    it('inserts unseen games with a generated id', () => {
        counter = 0
        const result = mergeSourceGames([], [incoming('hades')], 'lutris', byLutrisSlug, makeId)
        expect(result).toHaveLength(1)
        expect(result[0]).toMatchObject({ id: 'new-0', lutrisSlug: 'hades' })
    })

    it('keeps the existing id when a game is re-scanned', () => {
        const current = [makeGame({ id: 'stable', lutrisSlug: 'hades' })]
        const result = mergeSourceGames(current, [incoming('hades')], 'lutris', byLutrisSlug, makeId)
        expect(result[0]!.id).toBe('stable')
    })

    it('preserves user-owned state across a re-scan', () => {
        const current = [
            makeGame({
                id: 'g1',
                lutrisSlug: 'hades',
                isFavorite: true,
                notes: 'beat it twice',
                manualUnlocks: { ACH_ONE: 1700000000 },
                metadataAppId: '1145360',
            }),
        ]
        const result = mergeSourceGames(current, [incoming('hades')], 'lutris', byLutrisSlug, makeId)
        expect(result[0]).toMatchObject({
            isFavorite: true,
            notes: 'beat it twice',
            manualUnlocks: { ACH_ONE: 1700000000 },
            metadataAppId: '1145360',
        })
    })

    it('takes fresh scanned values for non-user fields', () => {
        const current = [makeGame({ id: 'g1', lutrisSlug: 'hades', playtime: 10, isInstalled: false })]
        const result = mergeSourceGames(
            current,
            [incoming('hades', { playtime: 120, isInstalled: true })],
            'lutris',
            byLutrisSlug,
            makeId
        )
        expect(result[0]).toMatchObject({ playtime: 120, isInstalled: true })
    })

    it('drops rows of this source that are gone upstream', () => {
        const current = [
            makeGame({ id: 'g1', lutrisSlug: 'hades' }),
            makeGame({ id: 'g2', lutrisSlug: 'removed' }),
        ]
        const result = mergeSourceGames(current, [incoming('hades')], 'lutris', byLutrisSlug, makeId)
        expect(result.map((g) => g.lutrisSlug)).toEqual(['hades'])
    })

    // The clobbering regression: a Lutris scan must not disturb Steam rows.
    it('leaves every other source byte-identical', () => {
        const steam = makeGame({ id: 's1', source: 'steam', steamAppId: '440', title: 'TF2' })
        const manual = makeGame({ id: 'm1', source: 'manual', title: 'Some Binary' })
        const heroic = makeGame({ id: 'h1', source: 'heroic', heroicAppName: 'Fortnite' })
        const current = [steam, manual, heroic, makeGame({ id: 'l1', lutrisSlug: 'old' })]

        const result = mergeSourceGames(current, [incoming('new')], 'lutris', byLutrisSlug, makeId)

        expect(result.filter((g) => g.source !== 'lutris')).toEqual([steam, manual, heroic])
    })

    it('clears the source entirely when the scan comes back empty', () => {
        const steam = makeGame({ id: 's1', source: 'steam', steamAppId: '440' })
        const current = [steam, makeGame({ id: 'l1', lutrisSlug: 'hades' })]
        const result = mergeSourceGames(current, [], 'lutris', byLutrisSlug, makeId)
        expect(result).toEqual([steam])
    })

    it('ignores rows of this source that have no key', () => {
        const current = [makeGame({ id: 'orphan', lutrisSlug: undefined })]
        counter = 0
        const result = mergeSourceGames(current, [incoming('hades')], 'lutris', byLutrisSlug, makeId)
        expect(result).toHaveLength(1)
        expect(result[0]!.id).toBe('new-0')
    })
})
