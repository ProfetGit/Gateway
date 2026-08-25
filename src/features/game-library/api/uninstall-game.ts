import { invoke } from '@/lib/tauri-client'
import { UninstallResultSchema } from './game-library-schema'
import type { Game } from '../game-library-types'

export const uninstallGame = async (game: Game) => {
  const result = await invoke('uninstall_game', { game })
  return UninstallResultSchema.parse(result)
}
