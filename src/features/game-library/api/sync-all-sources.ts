import { invoke } from '@/lib/tauri-client'
import { GameSchema } from './game-library-schema'

export const syncAllSources = async () => {
  const result = await invoke('sync_all_sources')
  return GameSchema.array().parse(result)
}
