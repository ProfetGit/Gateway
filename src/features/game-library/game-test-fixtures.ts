import type { Game, FilterState } from './game-library-types'

export const DEFAULT_FILTERS: FilterState = {
    status: 'all',
    platform: 'all',
    onlyFavorites: false,
    search: '',
    sortBy: 'alphabetical',
    sortOrder: 'asc',
}

export function makeGame(overrides: Partial<Game> & { id: string; title: string }): Game {
    return {
        isInstalled: false,
        isFavorite: false,
        source: 'manual',
        ...overrides,
    }
}
