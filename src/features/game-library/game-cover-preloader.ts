import type { Game } from './game-library-types'

export function preloadGameCoverBatch(games: Game[]): Promise<void[]> {
    return Promise.all(
        games.map((game) => {
            const coverUrl = game.coverUrl
            if (!coverUrl && !game.localCoverPath) return Promise.resolve()
            return new Promise<void>((resolve) => {
                const img = new Image()
                img.onload = () => resolve()
                img.onerror = () => resolve()
                img.src = game.localCoverPath
                    ? `gateway://cover/${game.localCoverPath}`
                    : coverUrl!
            })
        })
    )
}
