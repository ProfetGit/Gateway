import { invoke } from '@/lib/tauri-client'

export const installSteamGame = (appId: string) => invoke<void>('install_steam_game', { appId })
