import { invoke } from '@/lib/tauri-client'
import { FetchGamesResultSchema } from './auth-schema'

export const fetchSteamGames = async () => {
  const result = await invoke('fetch_steam_games')
  return FetchGamesResultSchema.parse(result)
}
