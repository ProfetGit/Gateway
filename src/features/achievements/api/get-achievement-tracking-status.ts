import { invoke } from '@/lib/tauri-client'
import { AchievementTrackingStatusSchema } from './achievement-tracking-status-schema'

export const getAchievementTrackingStatus = async (gameId: string) => {
  const result = await invoke('get_achievement_tracking_status', { gameId })
  return AchievementTrackingStatusSchema.parse(result)
}
