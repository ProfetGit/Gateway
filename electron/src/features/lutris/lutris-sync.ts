import { v4 as uuidv4 } from 'uuid'
import { JsonStore } from '../../shared/store'
import { mergeSourceGames, type IncomingGame } from '../../shared/merge-source-games'
import { mirrorLocalArt } from '../../shared/utils'
import { scanLutrisGames, getLutrisBannerPath } from './lutris-scanner'
import { toGameFields, resolveLutrisSteamAppId } from './lutris-library-parser'
import type { Game } from '../../shared/types'

/**
 * Import the Lutris library. Games Lutris manages *through Steam* are skipped
 * when Gateway already has that appid from the Steam sync — otherwise the same
 * title shows up twice.
 */
export async function performLutrisSync(store: JsonStore): Promise<Game[]> {
    const result = await scanLutrisGames()
    if (!result) {
        console.log('[Lutris] Not installed, skipping')
        return store.get('games')
    }
    console.log(`[Lutris] Scanned ${result.games.length} games`)

    // Re-read immediately before writing — background writers mutate the same
    // store on their own timers.
    const current = store.get('games')
    const ownedSteamAppIds = new Set(
        current.filter((game) => game.source === 'steam' && game.steamAppId).map((game) => game.steamAppId)
    )

    const incoming: IncomingGame[] = []
    for (const game of result.games) {
        const steamAppId = resolveLutrisSteamAppId(game.slug)
        if (steamAppId && ownedSteamAppIds.has(steamAppId)) continue
        incoming.push({
            key: game.slug,
            fields: toGameFields(game, result.installedIds.has(game.id)),
        })
    }

    const merged = mergeSourceGames(current, incoming, 'lutris', (game) => game.lutrisSlug, uuidv4)

    const coverBySlug = new Map(result.games.map((game) => [game.slug, game.coverPath]))
    for (const game of merged) {
        if (game.source !== 'lutris' || !game.lutrisSlug) continue

        if (!game.localCoverPath) {
            const coverPath = coverBySlug.get(game.lutrisSlug)
            const fileName = coverPath ? mirrorLocalArt(coverPath, 'covers', game.id) : null
            if (fileName) game.localCoverPath = fileName
        }

        if (!game.heroImageUrl) {
            const bannerPath = getLutrisBannerPath(game.lutrisSlug)
            const fileName = bannerPath ? mirrorLocalArt(bannerPath, 'heroes', game.id) : null
            if (fileName) game.heroImageUrl = `gateway://hero/${fileName}`
        }
    }

    store.set('games', merged)
    return merged
}
