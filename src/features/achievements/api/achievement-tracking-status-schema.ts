import { z } from 'zod'

export const TrackingFlagSchema = z.object({
  file: z.string(),
  key: z.string(),
  rawValue: z.string(),
  enabled: z.union([z.boolean(), z.literal('unknown')]),
})

export const AchievementTrackingStatusSchema = z.object({
  summary: z.enum(['active', 'flag-off', 'no-file-yet', 'unknown']),
  flags: z.array(TrackingFlagSchema),
  achievementFilePath: z.string().optional(),
  achievementFileHasProgress: z.boolean(),
})
export type AchievementTrackingStatus = z.infer<typeof AchievementTrackingStatusSchema>
