import { invoke } from '@/lib/tauri-client'
import { PrefixInspectionSchema, type PrefixInspection } from './launch-schema'

export const inspectPrefix = async (path: string): Promise<PrefixInspection> => {
  const result = await invoke('inspect_prefix', { path })
  return PrefixInspectionSchema.parse(result)
}
