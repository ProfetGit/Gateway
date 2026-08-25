import { invoke } from '@/lib/tauri-client'
import { GameSchema } from './game-library-schema'
import type { Game } from '../game-library-types'

export const updateGame = async (id: string, updates: Partial<Game>): Promise<Game> => {
  const result = await invoke<Game>('update_game', { id, updates })
  return GameSchema.parse(result)
}
