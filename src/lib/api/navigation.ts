import { invoke } from '@/lib/tauri-client'

export const openSteamStore = (appId: string | number) =>
  invoke<void>('open_steam_store', { appId: String(appId) })

export const openUrl = (url: string) => invoke<void>('open_url', { url })
