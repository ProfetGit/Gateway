import { z } from 'zod'

export const AchievementSchema = z.object({
  apiname: z.string(),
  name: z.string(),
  description: z.string(),
  achieved: z.boolean(),
  unlocktime: z.number(),
  icon: z.string(),
  icongray: z.string(),
})
export type Achievement = z.infer<typeof AchievementSchema>

export const FetchAchievementsResultSchema = z.object({
  success: z.boolean(),
  achievements: z.array(AchievementSchema),
  totalAchievements: z.number(),
  unlockedCount: z.number(),
  gameName: z.string().optional(),
  error: z.string().optional(),
  errorCode: z
    .enum(['NO_API_KEY', 'PROFILE_PRIVATE', 'NO_ACHIEVEMENTS', 'API_ERROR', 'NETWORK_ERROR'])
    .optional(),
})
export type FetchAchievementsResult = z.infer<typeof FetchAchievementsResultSchema>
