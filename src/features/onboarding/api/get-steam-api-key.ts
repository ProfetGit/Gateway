import { invoke } from '@/lib/tauri-client'

export const getSteamApiKey = () => invoke<string>('get_steam_api_key')
