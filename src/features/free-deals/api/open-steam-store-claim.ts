import { invoke } from '@/lib/tauri-client'

export const openSteamStoreClaim = (appId: string | number) =>
  invoke<void>('open_steam_store_claim', { appId: String(appId) })
