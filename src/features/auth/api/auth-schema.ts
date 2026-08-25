import { z } from 'zod'

export const SteamUserSchema = z.object({
  steamId: z.string(),
  username: z.string(),
  avatarUrl: z.string(),
  profileUrl: z.string(),
})
export type SteamUser = z.infer<typeof SteamUserSchema>

export const AuthStateSchema = z.object({
  isLoggedIn: z.boolean(),
  user: SteamUserSchema.nullable(),
})
export type AuthState = z.infer<typeof AuthStateSchema>

export const SteamOwnedGameSchema = z.object({
  appId: z.string(),
  name: z.string(),
  playtime: z.number(),
})

export const FetchGamesResultSchema = z.object({
  success: z.boolean(),
  games: z.array(SteamOwnedGameSchema),
  error: z.string().optional(),
  errorCode: z
    .enum(['NO_API_KEY', 'PROFILE_PRIVATE', 'API_ERROR', 'NETWORK_ERROR', 'RATE_LIMITED'])
    .optional(),
})
export type FetchGamesResult = z.infer<typeof FetchGamesResultSchema>
