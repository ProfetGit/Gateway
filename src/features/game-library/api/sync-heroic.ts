import { invoke } from '@/lib/tauri-client'
import { parseGames } from './game-library-schema'

export const syncHeroic = async () => {
  const result = await invoke('sync_heroic')
  return parseGames(result)
}
