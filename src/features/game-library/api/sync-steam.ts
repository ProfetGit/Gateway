import { invoke } from '@/lib/tauri-client'
import { GameSchema } from './game-library-schema'
import type { Game } from '../game-library-types'

export const syncSteam = async (): Promise<Game[]> => {
  const result = await invoke<Game[]>('sync_steam')
  return GameSchema.array().parse(result)
}
