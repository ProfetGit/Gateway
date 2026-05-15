import { describe, it, expect } from 'vitest'
import { filterAndSortGames } from './gameFilters'
import type { Game, FilterState } from '../types/game'

const DEFAULT_FILTERS: FilterState = {
    status: 'all',
    platform: 'all',
    onlyFavorites: false,
    hideDlc: false,
    search: '',
    sortBy: 'alphabetical',
    sortOrder: 'asc',
}

function makeGame(overrides: Partial<Game> & { id: string; title: string }): Game {
    return {
        isInstalled: false,
        isFavorite: false,
        source: 'manual',
        ...overrides,
    }
}

describe('filterAndSortGames', () => {
    describe('search filter', () => {
        it('returns all games when search is empty', () => {
            const games = [
                makeGame({ id: '1', title: 'Hades' }),
                makeGame({ id: '2', title: 'Celeste' }),
            ]
            expect(filterAndSortGames(games, DEFAULT_FILTERS)).toHaveLength(2)
        })

        it('filters by title case-insensitively', () => {
            const games = [
                makeGame({ id: '1', title: 'Hades' }),
                makeGame({ id: '2', title: 'Celeste' }),
            ]
            const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, search: 'hades' })
            expect(result).toHaveLength(1)
            expect(result[0].title).toBe('Hades')
        })

        it('returns empty when no title matches', () => {
            const games = [makeGame({ id: '1', title: 'Hades' })]
            expect(filterAndSortGames(games, { ...DEFAULT_FILTERS, search: 'zzz' })).toHaveLength(0)
        })

        it('matches partial title substrings', () => {
            const games = [
                makeGame({ id: '1', title: 'Hades II' }),
                makeGame({ id: '2', title: 'Celeste' }),
            ]
            const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, search: 'hades' })
            expect(result).toHaveLength(1)
        })
    })

    describe('status filter', () => {
        it('shows only installed games when status is installed', () => {
            const games = [
                makeGame({ id: '1', title: 'A', isInstalled: true }),
                makeGame({ id: '2', title: 'B', isInstalled: false }),
            ]
            const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, status: 'installed' })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('1')
        })

        it('shows all games when status is all', () => {
            const games = [
                makeGame({ id: '1', title: 'A', isInstalled: true }),
                makeGame({ id: '2', title: 'B', isInstalled: false }),
            ]
            expect(filterAndSortGames(games, DEFAULT_FILTERS)).toHaveLength(2)
        })
    })

    describe('platform filter', () => {
        it('shows only steam games when platform is steam', () => {
            const games = [
                makeGame({ id: '1', title: 'A', source: 'steam' }),
                makeGame({ id: '2', title: 'B', source: 'manual' }),
            ]
            const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, platform: 'steam' })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('1')
        })

        it('shows all sources when platform is all', () => {
            const games = [
                makeGame({ id: '1', title: 'A', source: 'steam' }),
                makeGame({ id: '2', title: 'B', source: 'manual' }),
            ]
            expect(filterAndSortGames(games, DEFAULT_FILTERS)).toHaveLength(2)
        })
    })

    describe('favorites filter', () => {
        it('shows only favorites when onlyFavorites is true', () => {
            const games = [
                makeGame({ id: '1', title: 'A', isFavorite: true }),
                makeGame({ id: '2', title: 'B', isFavorite: false }),
            ]
            const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, onlyFavorites: true })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('1')
        })

        it('shows all games when onlyFavorites is false', () => {
            const games = [
                makeGame({ id: '1', title: 'A', isFavorite: true }),
                makeGame({ id: '2', title: 'B', isFavorite: false }),
            ]
            expect(filterAndSortGames(games, DEFAULT_FILTERS)).toHaveLength(2)
        })
    })

    describe('sorting', () => {
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
            expect(result[0].id).toBe('2')
            expect(result[1].id).toBe('1')
        })
    })

    describe('hideDlc filter', () => {
        it('hides classified non-game entries when hideDlc is true', () => {
            const games = [
                makeGame({ id: '1', title: 'Cyberpunk 2077', source: 'steam' }),
                makeGame({ id: '2', title: 'Phantom Liberty', source: 'steam', appType: 'dlc' }),
                makeGame({ id: '3', title: 'OST Pack', source: 'steam', appType: 'music' }),
            ]
            const result = filterAndSortGames(games, { ...DEFAULT_FILTERS, hideDlc: true })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('1')
        })

        it('keeps unclassified entries visible when hideDlc is true', () => {
            const games = [makeGame({ id: '1', title: 'Unknown Entry', source: 'steam' })]
            expect(filterAndSortGames(games, { ...DEFAULT_FILTERS, hideDlc: true })).toHaveLength(1)
        })

        it('shows all entries including DLC when hideDlc is false', () => {
            const games = [
                makeGame({ id: '1', title: 'Game', source: 'steam' }),
                makeGame({ id: '2', title: 'DLC', source: 'steam', appType: 'dlc' }),
            ]
            expect(filterAndSortGames(games, { ...DEFAULT_FILTERS, hideDlc: false })).toHaveLength(2)
        })
    })

    describe('combined filters', () => {
        it('applies search and status simultaneously', () => {
            const games = [
                makeGame({ id: '1', title: 'Hades', isInstalled: true }),
                makeGame({ id: '2', title: 'Hades II', isInstalled: false }),
                makeGame({ id: '3', title: 'Celeste', isInstalled: true }),
            ]
            const result = filterAndSortGames(games, {
                ...DEFAULT_FILTERS,
                search: 'hades',
                status: 'installed',
            })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('1')
        })

        it('applies platform and favorites simultaneously', () => {
            const games = [
                makeGame({ id: '1', title: 'A', source: 'steam', isFavorite: true }),
                makeGame({ id: '2', title: 'B', source: 'steam', isFavorite: false }),
                makeGame({ id: '3', title: 'C', source: 'manual', isFavorite: true }),
            ]
            const result = filterAndSortGames(games, {
                ...DEFAULT_FILTERS,
                platform: 'steam',
                onlyFavorites: true,
            })
            expect(result).toHaveLength(1)
            expect(result[0].id).toBe('1')
        })
    })
})
