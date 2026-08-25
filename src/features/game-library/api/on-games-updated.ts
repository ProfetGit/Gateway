import { listen, type UnlistenFn } from '@/lib/tauri-client'
import type { Game } from '../game-library-types'

export const onGamesUpdated = (cb: (games: Game[]) => void): Promise<UnlistenFn> =>
  listen<Game[]>('games-updated', (event) => cb(event.payload))
