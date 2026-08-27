import { invoke } from '@/lib/tauri-client'
import { ResetPrefixResultSchema, type ResetPrefixResult } from './launch-schema'

/**
 * Empties a wine prefix so an install can be retried under a different Proton.
 * The main process refuses any path that is not plausibly a prefix.
 */
export const resetWinePrefix = async (path: string): Promise<ResetPrefixResult> => {
    const result = await invoke('reset_wine_prefix', { path })
    return ResetPrefixResultSchema.parse(result)
}
