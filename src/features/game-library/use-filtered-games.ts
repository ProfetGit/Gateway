import { useMemo } from 'react'
import { useGameStore } from './game-store'
import { filterAndSortGames } from './game-filters'

// Selector hook for filtered games
export const useFilteredGames = () => {
    const games = useGameStore(state => state.games)
    const filters = useGameStore(state => state.filters)

    return useMemo(() => filterAndSortGames(games, filters), [games, filters])
}
