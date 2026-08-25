import { listen, type UnlistenFn } from '@/lib/tauri-client'
import type { AuthState } from './auth-schema'

export const onAuthStateUpdated = (
  cb: (state: AuthState) => void
): Promise<UnlistenFn> =>
  listen<AuthState>('auth-state-updated', (event) => cb(event.payload))
