import { invoke } from '@/lib/tauri-client'

export const deleteGame = (id: string) => invoke<void>('delete_game', { id })
