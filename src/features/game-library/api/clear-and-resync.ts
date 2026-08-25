import { invoke } from '@/lib/tauri-client'
import { ClearAndResyncResultSchema } from './game-library-schema'

export const clearAndResync = async () => {
  const result = await invoke('clear_and_resync')
  return ClearAndResyncResultSchema.parse(result)
}
