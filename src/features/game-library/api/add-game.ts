import { invoke } from '@/lib/tauri-client'
import { GameSchema } from './game-library-schema'
import type { Game } from '../game-library-types'

export const addGame = async (game: Omit<Game, 'id'>): Promise<Game> => {
  const result = await invoke<Game>('add_game', { game })
  return GameSchema.parse(result)
}
