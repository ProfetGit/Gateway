import { invoke } from '@/lib/tauri-client'
import { FetchAchievementsResultSchema } from './achievements-schema'

export const getAchievements = async (appId: string) => {
  const result = await invoke('get_achievements', { appId })
  return FetchAchievementsResultSchema.parse(result)
}
