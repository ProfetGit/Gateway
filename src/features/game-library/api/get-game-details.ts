import { invoke } from '@/lib/tauri-client'
import { FetchGameDetailsResultSchema } from './game-library-schema'

export const getGameDetails = async (appId: string) => {
  const result = await invoke('get_game_details', { appId })
  return FetchGameDetailsResultSchema.parse(result)
}
