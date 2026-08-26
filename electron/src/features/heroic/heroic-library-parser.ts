import type { HeroicGame } from './heroic-types'

// ═══════════════════════════════════════════════════════════
// Heroic library parsers
// ═══════════════════════════════════════════════════════════
//
// Pure: these take already-parsed JSON and return HeroicGame[]. No fs, no
// child_process — which is what lets them be tested against inline fixtures
// with no Heroic installation present.
//
// Every parser tolerates garbage and returns [] rather than throwing. Heroic's
// on-disk shapes change between releases and a malformed cache file must not
// take down a library sync.

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null
}

function str(value: unknown): string | undefined {
    return typeof value === 'string' && value ? value : undefined
}

function num(value: unknown): number | undefined {
    return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

/**
 * store_cache/legendary_library.json — the full Epic library, owned games
 * included, not just installed ones. Preferred over installed.json.
 */
export function parseLegendaryLibrary(raw: unknown): HeroicGame[] {
    const library = asRecord(raw)?.library
    if (!Array.isArray(library)) return []

    const games: HeroicGame[] = []
    for (const entry of library) {
        const game = asRecord(entry)
        if (!game) continue

        const title = str(game.title)
        const appName = str(game.app_name)
        if (!title || !appName) continue

        const install = asRecord(game.install)
        // art_square is the 600x800 portrait cover; art_cover is the wide
        // banner. Do not swap these — the grid expects a tall cover.
        const artSquare = str(game.art_square)
        const artCover = str(game.art_cover)

        games.push({
            appName,
            title,
            runner: 'legendary',
            isInstalled: game.is_installed === true,
            installPath: str(install?.install_path),
            executable: str(install?.executable),
            platform: str(install?.platform) ?? 'Windows',
            installSize: num(install?.install_size) ?? 0,
            coverUrl: artSquare ?? artCover,
            heroUrl: artCover,
        })
    }
    return games
}

/**
 * Fallback for older Heroic layouts with no store cache: legendary's
 * installed.json, enriched from the per-game metadata files. Installed games
 * only, by construction.
 */
export function parseLegendaryInstalled(
    raw: unknown,
    metadataFor: (appName: string) => unknown,
): HeroicGame[] {
    const installed = asRecord(raw)
    if (!installed) return []

    const games: HeroicGame[] = []
    for (const [key, entry] of Object.entries(installed)) {
        const game = asRecord(entry)
        if (!game || game.is_dlc === true) continue

        const appName = str(game.app_name) ?? key
        const metadata = asRecord(metadataFor(appName))
        const keyImages = asRecord(metadata?.metadata)?.keyImages

        let coverUrl: string | undefined
        let heroUrl: string | undefined
        if (Array.isArray(keyImages)) {
            for (const image of keyImages) {
                const img = asRecord(image)
                if (img?.type === 'DieselGameBoxTall') coverUrl = str(img.url)
                else if (img?.type === 'DieselGameBox') heroUrl = str(img.url)
            }
        }

        games.push({
            appName,
            title: str(game.title) ?? str(metadata?.app_title) ?? appName,
            runner: 'legendary',
            isInstalled: true,
            installPath: str(game.install_path),
            executable: str(game.executable),
            platform: str(game.platform) ?? 'Windows',
            installSize: num(game.install_size) ?? 0,
            coverUrl,
            heroUrl,
        })
    }
    return games
}

/** gog_store/installed.json — a record keyed by appName. Installed only. */
export function parseGogInstalled(raw: unknown): HeroicGame[] {
    const installed = asRecord(raw)
    if (!installed) return []

    const games: HeroicGame[] = []
    for (const [key, entry] of Object.entries(installed)) {
        const game = asRecord(entry)
        if (!game) continue

        // The record key is the appName when the value omits it.
        const appName = str(game.appName) ?? key
        games.push({
            appName,
            title: str(game.title) ?? appName,
            runner: 'gog',
            isInstalled: true,
            installPath: str(game.install_path),
            executable: str(game.executable),
            platform: str(game.platform) ?? 'Windows',
            installSize: num(game.install_size) ?? 0,
        })
    }
    return games
}

/** sideload_apps/library.json — a flat array of user-added apps. */
export function parseSideloadLibrary(raw: unknown): HeroicGame[] {
    if (!Array.isArray(raw)) return []

    const games: HeroicGame[] = []
    for (const entry of raw) {
        const app = asRecord(entry)
        if (!app) continue

        const appName = str(app.app_name)
        if (!appName) continue

        const install = asRecord(app.install)
        games.push({
            appName,
            title: str(app.title) ?? appName,
            runner: 'sideload',
            isInstalled: true,
            installPath: str(install?.install_path),
            executable: str(install?.executable),
            platform: str(install?.platform) ?? 'Windows',
            installSize: num(install?.install_size) ?? 0,
            coverUrl: str(app.art_square) ?? str(app.art_cover),
            heroUrl: str(app.art_cover),
        })
    }
    return games
}
