import { v4 as uuidv4 } from 'uuid'
import { JsonStore } from '../../shared/store'
import { mergeSourceGames, type IncomingGame } from '../../shared/merge-source-games'
import { mirrorLocalArt } from '../../shared/utils'
import { getHeroicCoverPath } from './heroic-paths'
import { scanHeroicGames } from './heroic-scanner'
import type { Game } from '../../shared/types'
import type { HeroicGame } from './heroic-types'

function toGameFields(heroic: HeroicGame): Omit<Game, 'id'> {
    return {
        title: heroic.title,
        source: 'heroic',
        heroicAppName: heroic.appName,
        heroicRunner: heroic.runner,
        isInstalled: heroic.isInstalled,
        isFavorite: false,
        ...(heroic.executable && heroic.installPath
            ? { executablePath: `${heroic.installPath}/${heroic.executable}` }
            : {}),
        ...(heroic.coverUrl && { coverUrl: heroic.coverUrl }),
        ...(heroic.heroUrl && { heroImageUrl: heroic.heroUrl }),
        ...(heroic.installSize ? { sizeOnDisk: heroic.installSize } : {}),
    }
}

/**
 * Import the Heroic library. Remote art URLs are left as coverUrl/heroImageUrl
 * for the existing mirrorAllCovers pipeline to fetch; only when a game has no
 * remote art (typically GOG) do we fall back to Heroic's cached local icon.
 */
export async function performHeroicSync(store: JsonStore): Promise<Game[]> {
    const scanned = scanHeroicGames()
    console.log(`[Heroic] Scanned ${scanned.length} games`)

    const incoming: IncomingGame[] = scanned.map((heroic) => ({
        key: heroic.appName,
        fields: toGameFields(heroic),
    }))

    // Re-read immediately before writing — background writers (mirrorAllCovers,
    // resolveGamesInBackground) mutate the same store on their own timers.
    const merged = mergeSourceGames(
        store.get('games'),
        incoming,
        'heroic',
        (game) => game.heroicAppName,
        uuidv4,
    )

    for (const game of merged) {
        if (game.source !== 'heroic' || game.coverUrl || game.localCoverPath) continue
        const iconPath = game.heroicAppName ? getHeroicCoverPath(game.heroicAppName) : null
        if (!iconPath) continue
        const fileName = mirrorLocalArt(iconPath, 'covers', game.id)
        if (fileName) game.localCoverPath = fileName
    }

    store.set('games', merged)
    return merged
}
