import { z } from 'zod'

export const SetupStateSchema = z.object({
  hasCompletedSetup: z.boolean(),
  hasApiKey: z.boolean(),
  isSteamLoggedIn: z.boolean(),
  hasGames: z.boolean(),
})
export type SetupState = z.infer<typeof SetupStateSchema>

export const SetApiKeyResultSchema = z.object({
  success: z.boolean(),
  hasKey: z.boolean(),
  error: z.string().optional(),
})
