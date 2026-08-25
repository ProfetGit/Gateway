import { invoke } from '@/lib/tauri-client'
import { GameSchema } from './game-library-schema'

export const syncLutris = async () => {
  const result = await invoke('sync_lutris')
  return GameSchema.array().parse(result)
}
