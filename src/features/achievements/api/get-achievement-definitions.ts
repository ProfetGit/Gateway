import { invoke } from '@/lib/tauri-client'
import { FetchAchievementDefinitionsResultSchema } from './achievement-definitions-schema'

export const getAchievementDefinitions = async (appId: string) => {
  const result = await invoke('get_achievement_definitions', { appId })
  return FetchAchievementDefinitionsResultSchema.parse(result)
}
