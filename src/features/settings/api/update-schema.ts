import { z } from 'zod'

/**
 * Push payload from the main process's autoUpdater. A discriminated union —
 * parsed rather than cast, because it arrives inside a listen() callback where
 * an unrecognised state would otherwise fall through every branch silently.
 */
export const UpdateStatusSchema = z.discriminatedUnion('state', [
  z.object({ state: z.literal('checking') }),
  z.object({ state: z.literal('available'), version: z.string() }),
  z.object({ state: z.literal('current') }),
  z.object({ state: z.literal('downloading'), percent: z.number() }),
  z.object({ state: z.literal('ready'), version: z.string() }),
  z.object({ state: z.literal('error'), message: z.string() }),
])
export type UpdateStatus = z.infer<typeof UpdateStatusSchema>

export const CheckForUpdatesResultSchema = z.object({
  started: z.boolean(),
  reason: z.string().optional(),
})
