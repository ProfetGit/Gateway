import { z } from 'zod'

export const GameSchema = z.object({
  id: z.string(),
  title: z.string(),
  coverUrl: z.string().optional(),
  localCoverPath: z.string().optional(),
  executablePath: z.string().optional(),
  steamAppId: z.string().optional(),
  metadataAppId: z.string().optional(),
  manualUnlocks: z.record(z.string(), z.number()).optional(),
  winePrefix: z.string().optional(),
  shortcutId: z.string().optional(),
  heroicAppName: z.string().optional(),
  heroicRunner: z.enum(['legendary', 'gog', 'sideload']).optional(),
  lutrisId: z.number().optional(),
  lutrisSlug: z.string().optional(),
  isInstalled: z.boolean(),
  isFavorite: z.boolean(),
  // .catch() is load-bearing: this schema is parsed via GameSchema.array() in
  // get-games.ts, where a throw fails the ENTIRE library load and renders an
  // empty grid. Degrading one unknown row to 'manual' keeps the rest visible —
  // and rescues any gateway-data.json still holding source:'lutris' rows
  // written before commit 97d1e86 removed that value.
  source: z.enum(['manual', 'steam', 'shortcut', 'heroic', 'lutris']).catch('manual'),
  playtime: z.number().optional(),
  lastPlayed: z.string().optional(),
  sizeOnDisk: z.number().optional(),
  notes: z.string().optional(),
  launchArgs: z.string().optional(),
  heroImageUrl: z.string().optional(),
  logoImageUrl: z.string().optional(),
  customEnvVars: z.string().optional(),
  appType: z.enum(['game', 'dlc', 'application', 'music', 'demo', 'mod']).optional(),
})

export const SteamAppSearchHitSchema = z.object({
  appId: z.string(),
  name: z.string(),
})

export const SearchSteamAppsResultSchema = z.object({
  success: z.boolean(),
  results: z.array(SteamAppSearchHitSchema),
  error: z.string().optional(),
  errorCode: z.enum(['API_ERROR', 'NETWORK_ERROR']).optional(),
})

export const SteamStatusSchema = z.object({
  installed: z.boolean(),
  steamPath: z.string().nullable(),
  libraryPaths: z.array(z.string()),
  userId: z.string().nullable(),
  username: z.string().nullable(),
})

export const UninstallResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
})

export const LaunchResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
})

export const HeroicStatusSchema = z.object({
  installed: z.boolean(),
  dataPath: z.string().nullable(),
  gamesCount: z.number(),
  epicCount: z.number(),
  gogCount: z.number(),
  sideloadCount: z.number(),
})
export type HeroicStatus = z.infer<typeof HeroicStatusSchema>

export const LutrisStatusSchema = z.object({
  installed: z.boolean(),
  gamesCount: z.number(),
  installedCount: z.number(),
})
export type LutrisStatus = z.infer<typeof LutrisStatusSchema>

export const ClearAndResyncResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  totalGames: z.number().optional(),
  installedGames: z.number().optional(),
})

export const NewsItemSchema = z.object({
  gid: z.string(),
  title: z.string(),
  url: z.string(),
  author: z.string(),
  contents: z.string(),
  feedlabel: z.string(),
  feedname: z.string(),
  date: z.number(),
  appId: z.string(),
})

export const FetchNewsResultSchema = z.object({
  success: z.boolean(),
  news: z.array(NewsItemSchema),
  totalCount: z.number(),
  error: z.string().optional(),
  errorCode: z.enum(['NO_STEAM_APP', 'API_ERROR', 'NETWORK_ERROR']).optional(),
})

export const GameDetailsSchema = z.object({
  appId: z.string(),
  name: z.string(),
  shortDescription: z.string(),
  detailedDescription: z.string(),
  developers: z.array(z.string()),
  publishers: z.array(z.string()),
  releaseDate: z.string(),
  metacriticScore: z.number().optional(),
  metacriticUrl: z.string().optional(),
  pcRequirements: z.object({
    minimum: z.string().optional(),
    recommended: z.string().optional(),
  }),
  genres: z.array(z.string()),
  categories: z.array(z.string()),
})

export const FetchGameDetailsResultSchema = z.object({
  success: z.boolean(),
  details: GameDetailsSchema.nullable(),
  error: z.string().optional(),
  errorCode: z.enum(['NO_STEAM_APP', 'API_ERROR', 'NETWORK_ERROR']).optional(),
})
