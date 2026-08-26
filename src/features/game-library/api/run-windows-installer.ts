import { invoke } from '@/lib/tauri-client'
import { RunInstallerResultSchema, type RunInstallerResult } from './launch-schema'

export interface RunInstallerInput {
  installerPath: string
  title: string
  prefixPath: string
  protonPath?: string
}

export const runWindowsInstaller = async (input: RunInstallerInput): Promise<RunInstallerResult> => {
  const result = await invoke('run_windows_installer', { ...input })
  return RunInstallerResultSchema.parse(result)
}
