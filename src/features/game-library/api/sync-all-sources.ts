import { invoke } from '@/lib/tauri-client'
import { parseGames } from './game-library-schema'

export const syncAllSources = async () => {
  const result = await invoke('sync_all_sources')
  return parseGames(result)
}
