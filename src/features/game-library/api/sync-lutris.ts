import { invoke } from '@/lib/tauri-client'
import { parseGames } from './game-library-schema'

export const syncLutris = async () => {
  const result = await invoke('sync_lutris')
  return parseGames(result)
}
