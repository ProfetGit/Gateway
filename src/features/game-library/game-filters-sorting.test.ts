import { describe, it, expect } from 'vitest'
import { filterAndSortGames } from './game-filters'
import { DEFAULT_FILTERS, makeGame } from './game-test-fixtures'

describe('filterAndSortGames sorting', () => {
    it('sorts alphabetically asc by default', () => {
        const games = [
            makeGame({ id: '1', title: 'Zelda' }),
            makeGame({ id: '2', title: 'Hades' }),
            makeGame({ id: '3', title: 'Celeste' }),
        ]
        const result = filterAndSortGames(games, DEFAULT_FILTERS)
        expect(result.map(g => g.title)).toEqual(['Celeste', 'Hades', 'Zelda'])
    })

    it('sorts alphabetically desc', () => {
        const games = [
            makeGame({ id: '1', title: 'Zelda' }),
            makeGame({ id: '2', title: 'Celeste' }),
        ]
        const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, sortOrder: 'desc' })
        expect(result.map(g => g.title)).toEqual(['Zelda', 'Celeste'])
    })

    it('sorts by playtime desc, higher playtime first', () => {
        const games = [
            makeGame({ id: '1', title: 'A', playtime: 10 }),
            makeGame({ id: '2', title: 'B', playtime: 50 }),
            makeGame({ id: '3', title: 'C', playtime: 25 }),
        ]
        const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, sortBy: 'playtime', sortOrder: 'desc' })
        expect(result.map(g => g.id)).toEqual(['2', '3', '1'])
    })

    it('treats missing playtime as 0', () => {
        const games = [
            makeGame({ id: '1', title: 'A', playtime: 5 }),
            makeGame({ id: '2', title: 'B' }),
        ]
        const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, sortBy: 'playtime', sortOrder: 'desc' })
        expect(result.map(g => g.id)).toEqual(['1', '2'])
    })

    it('sorts by lastPlayed desc, most recent first', () => {
        const games = [
            makeGame({ id: '1', title: 'A', lastPlayed: '2024-01-01' }),
            makeGame({ id: '2', title: 'B' }),
            makeGame({ id: '3', title: 'C', lastPlayed: '2024-06-01' }),
        ]
        const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, sortBy: 'lastPlayed', sortOrder: 'desc' })
        expect(result.map(g => g.id)).toEqual(['3', '1', '2'])
    })

    it('treats missing lastPlayed as 0 (sorts last in desc)', () => {
        const games = [
            makeGame({ id: '1', title: 'A' }),
            makeGame({ id: '2', title: 'B', lastPlayed: '2024-01-01' }),
        ]
        const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, sortBy: 'lastPlayed', sortOrder: 'desc' })
        expect(result[0]!.id).toBe('2')
        expect(result[1]!.id).toBe('1')
    })
})
