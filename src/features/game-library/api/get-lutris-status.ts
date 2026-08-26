import { invoke } from '@/lib/tauri-client'
import { LutrisStatusSchema } from './game-library-schema'

export const getLutrisStatus = async () => {
  const result = await invoke('get_lutris_status')
  return LutrisStatusSchema.parse(result)
}
