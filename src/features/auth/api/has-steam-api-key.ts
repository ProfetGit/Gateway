import { invoke } from '@/lib/tauri-client'

export const hasSteamApiKey = () => invoke<boolean>('has_steam_api_key')
