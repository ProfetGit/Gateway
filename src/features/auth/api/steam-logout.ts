import { invoke } from '@/lib/tauri-client'
import { AuthStateSchema } from './auth-schema'

export const steamLogout = async () => {
  const result = await invoke('steam_logout')
  return AuthStateSchema.parse(result)
}
