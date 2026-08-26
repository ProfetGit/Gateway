import { invoke } from '@/lib/tauri-client'
import { LaunchToolsSchema, type LaunchTools } from './launch-schema'

export const detectLaunchTools = async (): Promise<LaunchTools> => {
  const result = await invoke('detect_launch_tools')
  return LaunchToolsSchema.parse(result)
}
