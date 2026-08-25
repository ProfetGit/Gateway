import { describe, it, expect } from 'vitest'
import { filterAndSortGames } from './game-filters'
import { DEFAULT_FILTERS, makeGame } from './game-test-fixtures'

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
            expect(result[0]!.title).toBe('Hades')
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
            expect(result[0]!.id).toBe('1')
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
            expect(result[0]!.id).toBe('1')
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
            expect(result[0]!.id).toBe('1')
        })

        it('shows all games when onlyFavorites is false', () => {
            const games = [
                makeGame({ id: '1', title: 'A', isFavorite: true }),
                makeGame({ id: '2', title: 'B', isFavorite: false }),
            ]
            expect(filterAndSortGames(games, DEFAULT_FILTERS)).toHaveLength(2)
        })
    })

    describe('appType filter (always-on)', () => {
        it('hides positively-classified non-game entries', () => {
            const games = [
                makeGame({ id: '1', title: 'Cyberpunk 2077', source: 'steam' }),
                makeGame({ id: '2', title: 'Phantom Liberty', source: 'steam', appType: 'dlc' }),
                makeGame({ id: '3', title: 'OST Pack', source: 'steam', appType: 'music' }),
            ]
            const result = filterAndSortGames(games, DEFAULT_FILTERS)
            expect(result).toHaveLength(1)
            expect(result[0]!.id).toBe('1')
        })

        it('keeps unclassified entries visible (no false negatives)', () => {
            const games = [makeGame({ id: '1', title: 'Unknown Entry', source: 'steam' })]
            expect(filterAndSortGames(games, DEFAULT_FILTERS)).toHaveLength(1)
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
            expect(result[0]!.id).toBe('1')
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
            expect(result[0]!.id).toBe('1')
        })
    })
})
