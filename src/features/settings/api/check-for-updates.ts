import { invoke } from '@/lib/tauri-client'
import { CheckForUpdatesResultSchema } from './update-schema'

export const checkForUpdates = async () => {
  const result = await invoke('check_for_updates')
  return CheckForUpdatesResultSchema.parse(result)
}
