import { invoke } from '@/lib/tauri-client'
import { SearchSteamAppsResultSchema } from './game-library-schema'

export const searchSteamApps = async (query: string) => {
  const result = await invoke('search_steam_apps', { query })
  return SearchSteamAppsResultSchema.parse(result)
}
