import { invoke } from '@/lib/tauri-client'
import { FetchTrendingResultSchema } from './trending-schema'

export const getTrendingGames = async () => {
  const result = await invoke('get_trending_games')
  return FetchTrendingResultSchema.parse(result)
}
