import { useQuery } from '@tanstack/react-query'
import { getGames } from './get-games'

export const gameLibraryKeys = {
  games: ['game-library', 'games'] as const,
}

export function useGamesQuery() {
  return useQuery({ queryKey: gameLibraryKeys.games, queryFn: getGames })
}
