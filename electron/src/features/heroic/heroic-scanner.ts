import path from 'node:path'
import { getHeroicDataPath, safeReadJson } from './heroic-paths'
import {
    parseLegendaryLibrary,
    parseLegendaryInstalled,
    parseGogInstalled,
    parseSideloadLibrary,
} from './heroic-library-parser'
import type { HeroicGame, HeroicStatus } from './heroic-types'

// ═══════════════════════════════════════════════════════════
// Heroic scanner — I/O shell around the pure parsers
// ═══════════════════════════════════════════════════════════

function scanEpic(dataPath: string): HeroicGame[] {
    // store_cache holds the full library (owned, not just installed), so it
    // wins when present.
    const cached = parseLegendaryLibrary(
        safeReadJson(path.join(dataPath, 'store_cache/legendary_library.json'))
    )
    if (cached.length > 0) return cached

    const metadataDir = path.join(dataPath, 'legendaryConfig/legendary/metadata')
    return parseLegendaryInstalled(
        safeReadJson(path.join(dataPath, 'legendaryConfig/legendary/installed.json')),
        (appName) => safeReadJson(path.join(metadataDir, `${appName}.json`))
    )
}

export function scanHeroicGames(): HeroicGame[] {
    const dataPath = getHeroicDataPath()
    if (!dataPath) return []

    return [
        ...scanEpic(dataPath),
        ...parseGogInstalled(safeReadJson(path.join(dataPath, 'gog_store/installed.json'))),
        ...parseSideloadLibrary(safeReadJson(path.join(dataPath, 'sideload_apps/library.json'))),
    ]
}

/**
 * Detection state for the Settings UI. Derived purely from file reads — the
 * old implementation shelled out to `heroic --version` for a value nothing
 * ever consumed.
 */
export function getHeroicStatus(): HeroicStatus {
    const dataPath = getHeroicDataPath()
    if (!dataPath) {
        return {
            installed: false,
            dataPath: null,
            gamesCount: 0,
            epicCount: 0,
            gogCount: 0,
            sideloadCount: 0,
        }
    }

    const games = scanHeroicGames()
    const countOf = (runner: HeroicGame['runner']) =>
        games.filter((game) => game.runner === runner).length

    return {
        installed: true,
        dataPath,
        gamesCount: games.length,
        epicCount: countOf('legendary'),
        gogCount: countOf('gog'),
        sideloadCount: countOf('sideload'),
    }
}
