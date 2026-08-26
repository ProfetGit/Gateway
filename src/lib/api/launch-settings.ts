import { z } from 'zod'
import { invoke } from '@/lib/tauri-client'

// Cross-cutting: Settings edits these, and the add-game flows read them to
// seed a new game. No single feature owns them, so they live in lib/api.

export const LaunchSettingsSchema = z.object({
  prefixRoot: z.string(),
  defaultProtonPath: z.string().optional(),
  defaultUseMangoHud: z.boolean(),
  defaultUseGameMode: z.boolean(),
})

export type LaunchSettings = z.infer<typeof LaunchSettingsSchema>

export const getLaunchSettings = async (): Promise<LaunchSettings> => {
  const result = await invoke('get_launch_settings')
  return LaunchSettingsSchema.parse(result)
}

export const setLaunchSettings = async (updates: Partial<LaunchSettings>): Promise<LaunchSettings> => {
  const result = await invoke('set_launch_settings', { updates })
  return LaunchSettingsSchema.parse(result)
}
