import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { runLutrisJson } from './lutris-cli'
import { extractJsonArray, parseLutrisGames } from './lutris-library-parser'
import type { LutrisCliGame, LutrisStatus } from './lutris-types'

// ═══════════════════════════════════════════════════════════
// Lutris scanner — I/O shell around the pure parser
// ═══════════════════════════════════════════════════════════

const LUTRIS_DATA_PATHS = [
    path.join(os.homedir(), '.local/share/lutris'),
    // Flatpak
    path.join(os.homedir(), '.var/app/net.lutris.Lutris/data/lutris'),
]

/**
 * Banner art, which the CLI does not expose — probe the on-disk cache. Cover
 * art comes straight from the CLI's `coverPath`, already existence-checked by
 * Lutris itself.
 */
export function getLutrisBannerPath(slug: string): string | null {
    for (const dataPath of LUTRIS_DATA_PATHS) {
        for (const ext of ['jpg', 'png']) {
            const bannerPath = path.join(dataPath, 'banners', `${slug}.${ext}`)
            if (fs.existsSync(bannerPath)) return bannerPath
        }
    }
    return null
}

export interface LutrisScanResult {
    games: LutrisCliGame[]
    installedIds: Set<number>
}

/**
 * Two CLI calls: the full library, then the installed subset. There is no
 * `installed` field on a row, so installed state has to come from the diff.
 */
export async function scanLutrisGames(): Promise<LutrisScanResult | null> {
    const allOut = await runLutrisJson(['--list-games', '--json'])
    if (allOut === null) return null

    const games = parseLutrisGames(extractJsonArray(allOut))

    const installedOut = await runLutrisJson(['--list-games', '--installed', '--json'])
    const installedIds = new Set(
        installedOut === null
            ? []
            : parseLutrisGames(extractJsonArray(installedOut)).map((game) => game.id)
    )

    return { games, installedIds }
}

export async function getLutrisStatus(): Promise<LutrisStatus> {
    const result = await scanLutrisGames()
    if (!result) return { installed: false, gamesCount: 0, installedCount: 0 }

    return {
        installed: true,
        gamesCount: result.games.length,
        installedCount: result.installedIds.size,
    }
}
