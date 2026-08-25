import { invoke } from '@/lib/tauri-client'
import { SteamStatusSchema } from './game-library-schema'

export const getSteamStatus = async () => {
  const result = await invoke('get_steam_status')
  return SteamStatusSchema.parse(result)
}
