import { v4 as uuidv4 } from 'uuid'
import { JsonStore } from '../../shared/store'
import { mergeSourceGames, type IncomingGame } from '../../shared/merge-source-games'
import { mirrorLocalArt } from '../../shared/utils'
import { getHeroicCoverPath, getHeroicDataPath } from './heroic-paths'
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
    // Heroic gone (uninstalled, Flatpak swapped, config unreadable) is NOT the
    // same as "you own nothing" — leave the imported rows alone rather than
    // deleting a library because a config file moved.
    if (!getHeroicDataPath()) {
        console.log('[Heroic] Not installed, leaving existing games untouched')
        return store.get('games')
    }

    const scanned = scanHeroicGames()
    console.log(`[Heroic] Scanned ${scanned.length} games`)

    const existingCount = store.get('games').filter((game) => game.source === 'heroic').length
    if (scanned.length === 0 && existingCount > 0) {
        // Installed but read nothing, while we hold rows from a scan that did
        // work. Far more likely a transient read than a genuinely emptied
        // library, and the wrong guess here is unrecoverable. Clear Library
        // remains the explicit way to drop them.
        console.warn(
            `[Heroic] Scan found 0 games but ${existingCount} are already imported — ` +
            'keeping them. Use Clear Library to remove them deliberately.'
        )
        return store.get('games')
    }

    const incoming: IncomingGame[] = scanned.map((heroic) => ({
        key: heroic.appName,
        fields: toGameFields(heroic),
    }))

    // updateGames re-reads at write time — background writers (mirrorAllCovers,
    // resolveGamesInBackground) touch the same array on their own timers.
    const merged = store.updateGames((games) =>
        mergeSourceGames(games, incoming, 'heroic', (game) => game.heroicAppName, uuidv4)
    )

    const artPatches = new Map<string, string>()
    for (const game of merged) {
        if (game.source !== 'heroic' || game.coverUrl || game.localCoverPath) continue
        const iconPath = game.heroicAppName ? getHeroicCoverPath(game.heroicAppName) : null
        if (!iconPath) continue
        const fileName = mirrorLocalArt(iconPath, 'covers', game.id)
        if (fileName) artPatches.set(game.id, fileName)
    }

    if (artPatches.size === 0) return merged

    return store.updateGames((games) =>
        games.map((game) => {
            const fileName = artPatches.get(game.id)
            return fileName ? { ...game, localCoverPath: fileName } : game
        })
    )
}
