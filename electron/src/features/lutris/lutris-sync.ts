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
    // CLI missing or failed — not the same as "you own nothing", so leave the
    // imported rows alone rather than deleting them over a failed subprocess.
    if (!result) {
        console.log('[Lutris] Not available, leaving existing games untouched')
        return store.get('games')
    }
    console.log(`[Lutris] Scanned ${result.games.length} games`)

    const existingCount = store.get('games').filter((game) => game.source === 'lutris').length
    if (result.games.length === 0 && existingCount > 0) {
        console.warn(
            `[Lutris] Scan found 0 games but ${existingCount} are already imported — ` +
            'keeping them. Use Clear Library to remove them deliberately.'
        )
        return store.get('games')
    }

    // Re-read immediately before writing — background writers mutate the same
    // store on their own timers.
    const current = store.get('games')
    const ownedSteamAppIds = new Set(
        current.filter((game) => game.source === 'steam' && game.steamAppId).map((game) => game.steamAppId)
    )

    // installedIds === null means the `--installed` call failed (commonly
    // because a Lutris GUI already holds the DBus name). Fall back to what we
    // recorded last time instead of declaring the whole library uninstalled.
    const previouslyInstalled = new Map(
        current.filter((game) => game.source === 'lutris' && game.lutrisSlug)
            .map((game) => [game.lutrisSlug!, game.isInstalled])
    )
    const isInstalled = (game: { id: number; slug: string }) =>
        result.installedIds
            ? result.installedIds.has(game.id)
            : previouslyInstalled.get(game.slug) ?? false

    const incoming: IncomingGame[] = []
    for (const game of result.games) {
        const steamAppId = resolveLutrisSteamAppId(game.slug)
        if (steamAppId && ownedSteamAppIds.has(steamAppId)) continue
        incoming.push({
            key: game.slug,
            fields: toGameFields(game, isInstalled(game)),
        })
    }

    const merged = store.updateGames((games) =>
        mergeSourceGames(games, incoming, 'lutris', (game) => game.lutrisSlug, uuidv4)
    )

    const coverBySlug = new Map(result.games.map((game) => [game.slug, game.coverPath]))
    const patches = new Map<string, Partial<Game>>()

    for (const game of merged) {
        if (game.source !== 'lutris' || !game.lutrisSlug) continue
        const patch: Partial<Game> = {}

        if (!game.localCoverPath) {
            const coverPath = coverBySlug.get(game.lutrisSlug)
            const fileName = coverPath ? mirrorLocalArt(coverPath, 'covers', game.id) : null
            if (fileName) patch.localCoverPath = fileName
        }

        if (!game.heroImageUrl) {
            const bannerPath = getLutrisBannerPath(game.lutrisSlug)
            const fileName = bannerPath ? mirrorLocalArt(bannerPath, 'heroes', game.id) : null
            if (fileName) patch.heroImageUrl = `gateway://hero/${fileName}`
        }

        if (Object.keys(patch).length > 0) patches.set(game.id, patch)
    }

    if (patches.size === 0) return merged

    return store.updateGames((games) =>
        games.map((game) => {
            const patch = patches.get(game.id)
            return patch ? { ...game, ...patch } : game
        })
    )
}
