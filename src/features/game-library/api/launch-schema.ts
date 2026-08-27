import { z } from 'zod'

// Schemas for the launch pipeline, the Windows-installer flow and art
// fetching. Split out of game-library-schema.ts only to keep that file under
// the 200-line cap.

export const LaunchToolsSchema = z.object({
  umu: z.boolean(),
  wine: z.boolean(),
  gamemode: z.boolean(),
  mangohud: z.boolean(),
})
export type LaunchTools = z.infer<typeof LaunchToolsSchema>

export const ProtonBuildSchema = z.object({
  name: z.string(),
  path: z.string(),
})
export type ProtonBuild = z.infer<typeof ProtonBuildSchema>

export const RankedExecutableSchema = z.object({
  path: z.string(),
  name: z.string(),
  size: z.number(),
  score: z.number(),
})
export type RankedExecutable = z.infer<typeof RankedExecutableSchema>

export const RunInstallerResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  candidates: z.array(RankedExecutableSchema),
  scannedWholePrefix: z.boolean(),
})
export type RunInstallerResult = z.infer<typeof RunInstallerResultSchema>

// Parsed inside a listen() callback, where a throw kills the listener and
// freezes the wizard on whatever it last showed.
export const InstallerProgressSchema = z.object({
  state: z.enum(['preparing', 'running', 'scanning', 'done', 'failed', 'cancelled']),
  message: z.string().optional(),
})
export type InstallerProgress = z.infer<typeof InstallerProgressSchema>

export const PrefixInspectionSchema = z.object({
  exists: z.boolean(),
  hasFiles: z.boolean(),
})
export type PrefixInspection = z.infer<typeof PrefixInspectionSchema>

export const ResetPrefixResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
})
export type ResetPrefixResult = z.infer<typeof ResetPrefixResultSchema>
