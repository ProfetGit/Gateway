import { z } from 'zod'

export const FreeDealSchema = z.object({
  id: z.string(),
  title: z.string(),
  originalPrice: z.string(),
  thumbnail: z.string(),
  image: z.string(),
  description: z.string(),
  claimUrl: z.string(),
  endDate: z.string(),
  status: z.string(),
  steamAppId: z.string().nullable(),
  store: z.enum(['steam', 'epic']).catch('steam'),
  alreadyOwned: z.boolean().catch(false),
})

export const FreeDealsDataSchema = z.object({
  deals: z.array(FreeDealSchema),
  fetchedAt: z.number(),
})

export const FetchFreeDealsResultSchema = z.object({
  success: z.boolean(),
  data: FreeDealsDataSchema.optional(),
  error: z.string().optional(),
})

export const CheckGameOwnedResultSchema = z.object({
  success: z.boolean(),
  owned: z.boolean(),
})
