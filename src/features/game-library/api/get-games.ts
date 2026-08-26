import { invoke } from '@/lib/tauri-client'
import { parseGames } from './game-library-schema'
import type { Game } from '../game-library-types'

export const getGames = async (): Promise<Game[]> => {
  const result = await invoke<Game[]>('get_games')
  return parseGames(result)
}
