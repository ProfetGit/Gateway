import { invoke } from '@/lib/tauri-client'
import type { Game } from '../game-library-types'

export const launchGame = (game: Game) => invoke<void>('launch_game', { game })
