import { invoke } from '@/lib/tauri-client'
import { SetApiKeyResultSchema } from './onboarding-schema'

export const setSteamApiKey = async (key: string) => {
  const result = await invoke('set_steam_api_key', { key })
  return SetApiKeyResultSchema.parse(result)
}
