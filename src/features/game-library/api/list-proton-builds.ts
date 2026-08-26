import { invoke } from '@/lib/tauri-client'
import { ProtonBuildSchema, type ProtonBuild } from './launch-schema'

export const listProtonBuilds = async (): Promise<ProtonBuild[]> => {
  const result = await invoke('list_proton_builds')
  return ProtonBuildSchema.array().parse(result)
}
