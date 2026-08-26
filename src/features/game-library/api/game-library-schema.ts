import { z } from 'zod'
import { APP_TYPES, LAUNCH_RUNNERS, type Game } from '../game-library-types'

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
  // .catch() for the same reason as `source` and `appType`: a runner value
  // written by a newer build must not drop the row on an older one. Degrading
  // to undefined just means 'auto' — infer from the file extension.
  runner: z.enum(LAUNCH_RUNNERS).optional().catch(undefined),
  protonPath: z.string().optional(),
  umuGameId: z.string().optional(),
  useMangoHud: z.boolean().optional(),
  useGameMode: z.boolean().optional(),
  // .catch() for the same reason as `source`: this is written straight from
  // Steam's appdetails `type`, which returns values we may not know about yet.
  // An unrecognised one degrades to undefined instead of failing the row.
  appType: z.enum(APP_TYPES).optional().catch(undefined),
})

/**
 * Parse a whole library, tolerating individual bad rows.
 *
 * GameSchema.array().parse() throws on the FIRST bad row, which meant a single
 * unrecognised field emptied the entire grid — the user's whole library
 * vanishing on restart until they hit Refresh. One malformed row should cost
 * one row, never all of them. Anything dropped is logged loudly so the
 * underlying data problem still gets noticed.
 */
export function parseGames(result: unknown): Game[] {
  if (!Array.isArray(result)) {
    console.error('Expected an array of games, got:', typeof result)
    return []
  }

  const games: Game[] = []
  const dropped: { index: number; issues: string }[] = []

  result.forEach((row, index) => {
    const parsed = GameSchema.safeParse(row)
    if (parsed.success) games.push(parsed.data)
    else dropped.push({ index, issues: parsed.error.issues.map((i) => `${i.path.join('.')}: ${i.message}`).join('; ') })
  })

  if (dropped.length > 0) {
    console.error(`Dropped ${dropped.length} malformed game row(s) of ${result.length}:`, dropped)
  }

  return games
}

export const SteamAppSearchHitSchema = z.object({
  appId: z.string(),
  name: z.string(),
  // Steam's own content-hashed art URLs, carried through from the search
  // response — the guessable .../<appid>/header.jpg path 404s for newer apps.
  capsuleUrl: z.string().optional(),
  iconUrl: z.string().optional(),
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
