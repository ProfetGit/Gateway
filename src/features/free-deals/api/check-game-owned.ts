import { invoke } from '@/lib/tauri-client'
import { CheckGameOwnedResultSchema } from './free-deals-schema'

export const checkGameOwned = async (appId: string) => {
  const result = await invoke('check_game_owned', { appId })
  return CheckGameOwnedResultSchema.parse(result)
}
