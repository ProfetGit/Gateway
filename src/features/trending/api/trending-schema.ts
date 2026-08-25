import { z } from 'zod'

export const TrendingGameSchema = z.object({
  id: z.number(),
  name: z.string(),
  headerImage: z.string(),
  capsuleImage: z.string().optional(),
  discountPercent: z.number().optional(),
  originalPrice: z.string().optional(),
  finalPrice: z.string().optional(),
  windowsAvailable: z.boolean(),
  linuxAvailable: z.boolean(),
  macAvailable: z.boolean(),
})

export const TrendingDataSchema = z.object({
  games: z.array(TrendingGameSchema),
  fetchedAt: z.number(),
  source: z.enum(['top_sellers', 'specials', 'new_releases']),
})

export const FetchTrendingResultSchema = z.object({
  success: z.boolean(),
  data: TrendingDataSchema.optional(),
  error: z.string().optional(),
})
