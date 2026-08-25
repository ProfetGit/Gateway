import { invoke } from '@/lib/tauri-client'
import { LaunchResultSchema } from './game-library-schema'
import type { Game } from '../game-library-types'

export const launchGame = async (game: Game) => {
  const result = await invoke('launch_game', { game })
  return LaunchResultSchema.parse(result)
}
