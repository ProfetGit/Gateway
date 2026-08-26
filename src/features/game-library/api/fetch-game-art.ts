import { z } from 'zod'
import { invoke } from '@/lib/tauri-client'
import { GameSchema } from './game-library-schema'

const FetchGameArtResultSchema = z.object({
  success: z.boolean(),
  error: z.string().optional(),
  game: GameSchema.optional(),
})

export type FetchGameArtResult = z.infer<typeof FetchGameArtResultSchema>

/**
 * Mirror this game's cover, hero and logo art locally. Needs a Steam match.
 *
 * `force` replaces art the user or Steam's grid cache provided; without it
 * that art is left alone, which is what the automatic post-match fetch wants.
 */
export const fetchGameArt = async (id: string, force = false): Promise<FetchGameArtResult> => {
  const result = await invoke('fetch_game_art', { id, force })
  return FetchGameArtResultSchema.parse(result)
}
