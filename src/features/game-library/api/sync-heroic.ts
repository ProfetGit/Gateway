import { invoke } from '@/lib/tauri-client'
import { GameSchema } from './game-library-schema'

export const syncHeroic = async () => {
  const result = await invoke('sync_heroic')
  return GameSchema.array().parse(result)
}
