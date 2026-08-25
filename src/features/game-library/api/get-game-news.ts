import { invoke } from '@/lib/tauri-client'
import { FetchNewsResultSchema } from './game-library-schema'

export const getGameNews = async (appId: string, count = 10) => {
  const result = await invoke('get_game_news', { appId, count })
  return FetchNewsResultSchema.parse(result)
}
