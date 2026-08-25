import { invoke } from '@/lib/tauri-client'
import { GameSchema } from './game-library-schema'
import type { Game } from '../game-library-types'

export const getGames = async (): Promise<Game[]> => {
  const result = await invoke<Game[]>('get_games')
  return GameSchema.array().parse(result)
}
