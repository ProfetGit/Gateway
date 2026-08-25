import { invoke } from '@/lib/tauri-client'
import { AuthStateSchema } from './auth-schema'

export const getAuthState = async () => {
  const result = await invoke('get_auth_state')
  return AuthStateSchema.parse(result)
}
