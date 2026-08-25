import { z } from 'zod'
import { invoke } from '@/lib/tauri-client'

const RescanResultSchema = z.object({ success: z.boolean() })

export const rescanAchievementWatchers = async () => {
  const result = await invoke('rescan_achievement_watchers')
  return RescanResultSchema.parse(result)
}
