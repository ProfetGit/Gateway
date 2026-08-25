import { invoke } from '@/lib/tauri-client'
import { AuthStateSchema } from './auth-schema'

export const steamLogin = async () => {
  const result = await invoke('steam_login')
  return AuthStateSchema.parse(result)
}
