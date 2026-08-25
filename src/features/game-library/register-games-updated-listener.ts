import { onGamesUpdated } from './api/on-games-updated'
import type { Game } from './game-library-types'

let _unlisten: (() => void) | undefined

// Register the games-updated listener once; re-register on HMR if needed.
export function registerGamesUpdatedListener(setGames: (games: Game[]) => void) {
    onGamesUpdated((updatedGames) => {
        setGames(updatedGames)
    }).then((unlisten) => {
        _unlisten?.()
        _unlisten = unlisten
    })
}
