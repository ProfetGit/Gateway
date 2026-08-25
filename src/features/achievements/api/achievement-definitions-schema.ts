import { z } from 'zod'

export const AchievementDefinitionSchema = z.object({
  apiname: z.string(),
  name: z.string(),
  description: z.string(),
  icon: z.string(),
  icongray: z.string(),
  hidden: z.boolean(),
  globalPercent: z.number().optional(),
})
export type AchievementDefinition = z.infer<typeof AchievementDefinitionSchema>

export const FetchAchievementDefinitionsResultSchema = z.object({
  success: z.boolean(),
  appId: z.string(),
  gameName: z.string().optional(),
  definitions: z.array(AchievementDefinitionSchema),
  error: z.string().optional(),
  errorCode: z
    .enum(['NO_SOURCE', 'NO_ACHIEVEMENTS', 'API_ERROR', 'NETWORK_ERROR'])
    .optional(),
})
export type FetchAchievementDefinitionsResult = z.infer<typeof FetchAchievementDefinitionsResultSchema>
