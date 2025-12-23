import { existsSync, readFileSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'
import { HeroicGame, HeroicStatus } from '../../shared/types'

// ═══════════════════════════════════════════════════════════
// Heroic Data Paths
// ═══════════════════════════════════════════════════════════

const HEROIC_DATA_PATHS = [
    // Standard installation
    join(homedir(), '.config/heroic'),
    // Flatpak installation
    join(homedir(), '.var/app/com.heroicgameslauncher.hgl/config/heroic'),
]

export function getHeroicDataPath(): string | null {
    for (const path of HEROIC_DATA_PATHS) {
        // Check for config.json as indicator of valid Heroic installation
        if (existsSync(join(path, 'config.json'))) {
            return path
        }
    }
    return null
}

function safeReadJson<T>(filePath: string): T | null {
    try {
        if (!existsSync(filePath)) return null
        const content = readFileSync(filePath, 'utf-8')
        return JSON.parse(content) as T
    } catch (error) {
        console.warn(`[Heroic] Failed to read JSON from ${filePath}:`, error)
        return null
    }
}

// ═══════════════════════════════════════════════════════════
// Heroic Status Detection
// ═══════════════════════════════════════════════════════════

export async function getHeroicStatus(): Promise<HeroicStatus> {
    const dataPath = getHeroicDataPath()

    // Check if Heroic CLI is available
    let version: string | null = null
    try {
        const output = execSync('heroic --version 2>/dev/null || flatpak run com.heroicgameslauncher.hgl --version 2>/dev/null', {
            encoding: 'utf-8',
            timeout: 5000,
            shell: '/bin/bash'
        })
        version = output.trim()
    } catch {
        // Heroic CLI not available, but app might still be installed
    }

    if (!dataPath) {
        return {
            installed: false,
            version,
            dataPath: null,
            gamesCount: 0,
            epicCount: 0,
            gogCount: 0,
            sideloadCount: 0,
        }
    }

    // Count games from each source
    const epicGames = scanEpicGames(dataPath)
    const gogGames = scanGogGames(dataPath)
    const sideloadGames = scanSideloadApps(dataPath)

    return {
        installed: true,
        version,
        dataPath,
        gamesCount: epicGames.length + gogGames.length + sideloadGames.length,
        epicCount: epicGames.length,
        gogCount: gogGames.length,
        sideloadCount: sideloadGames.length,
    }
}

// ═══════════════════════════════════════════════════════════
// Epic Games (Legendary) Scanner
// ═══════════════════════════════════════════════════════════

interface LegendaryLibraryGame {
    app_name: string
    title: string
    art_cover?: string
    art_square?: string
    is_installed: boolean
    install?: {
        install_path?: string
        executable?: string
        install_size?: number
        platform?: string
    }
    runner: string
    developer?: string
    folder_name?: string
    cloud_save_enabled?: boolean
    store_url?: string
}

interface LegendaryLibrary {
    library: LegendaryLibraryGame[]
}

function scanEpicGames(dataPath: string): HeroicGame[] {
    // Try store_cache/legendary_library.json first (contains ALL games)
    const fullLibraryPath = join(dataPath, 'store_cache/legendary_library.json')
    const fullLibrary = safeReadJson<LegendaryLibrary>(fullLibraryPath)

    if (fullLibrary?.library && Array.isArray(fullLibrary.library)) {
        console.log(`[Heroic] Found full Epic library with ${fullLibrary.library.length} games`)

        const games: HeroicGame[] = []

        for (const game of fullLibrary.library) {
            // Skip if title looks like DLC (heuristic)
            if (!game.title) continue

            games.push({
                appName: game.app_name,
                title: game.title,
                installPath: game.install?.install_path,
                executable: game.install?.executable,
                platform: game.install?.platform || 'Windows',
                installSize: game.install?.install_size || 0,
                runner: 'legendary',
                isInstalled: game.is_installed === true,
                // art_square = tall vertical cover (600x800), art_cover = wide banner
                coverUrl: game.art_square || game.art_cover,
                heroUrl: game.art_cover,
            })
        }

        console.log(`[Heroic] Found ${games.filter(g => g.isInstalled).length} installed, ${games.filter(g => !g.isInstalled).length} not installed`)
        return games
    }

    // Fallback: Read from installed.json only (legacy behavior)
    const installedPath = join(dataPath, 'legendaryConfig/legendary/installed.json')
    const metadataDir = join(dataPath, 'legendaryConfig/legendary/metadata')

    interface LegendaryInstalledGame {
        app_name: string
        title: string
        install_path: string
        executable: string
        install_size: number
        platform: string
        version: string
        is_dlc?: boolean
    }

    interface LegendaryMetadata {
        app_name: string
        app_title: string
        metadata?: {
            keyImages?: Array<{
                type: string
                url: string
            }>
        }
    }

    const installed = safeReadJson<Record<string, LegendaryInstalledGame>>(installedPath)
    if (!installed) return []

    const games: HeroicGame[] = []

    for (const [appName, gameData] of Object.entries(installed)) {
        if (gameData.is_dlc) continue

        const metadataPath = join(metadataDir, `${appName}.json`)
        const metadata = safeReadJson<LegendaryMetadata>(metadataPath)

        let coverUrl: string | undefined
        let heroUrl: string | undefined

        if (metadata?.metadata?.keyImages) {
            for (const img of metadata.metadata.keyImages) {
                if (img.type === 'DieselGameBoxTall') coverUrl = img.url
                else if (img.type === 'DieselGameBox') heroUrl = img.url
            }
        }

        games.push({
            appName: gameData.app_name,
            title: gameData.title || metadata?.app_title || appName,
            installPath: gameData.install_path,
            executable: gameData.executable,
            platform: gameData.platform || 'Windows',
            installSize: gameData.install_size,
            runner: 'legendary',
            isInstalled: true,
            coverUrl,
            heroUrl,
        })
    }

    console.log(`[Heroic] Found ${games.length} Epic games (installed only - fallback)`)
    return games
}

// ═══════════════════════════════════════════════════════════
// GOG Games (gogdl) Scanner
// ═══════════════════════════════════════════════════════════

interface GogInstalledGame {
    appName: string
    title: string
    install_path: string
    executable: string
    install_size: number
    platform: string
    buildId?: string
}

function scanGogGames(dataPath: string): HeroicGame[] {
    const installedPath = join(dataPath, 'gog_store/installed.json')

    const installed = safeReadJson<Record<string, GogInstalledGame>>(installedPath)
    if (!installed) return []

    const games: HeroicGame[] = []

    for (const [appName, gameData] of Object.entries(installed)) {
        games.push({
            appName: gameData.appName || appName,
            title: gameData.title || appName,
            installPath: gameData.install_path,
            executable: gameData.executable,
            platform: gameData.platform || 'Windows',
            installSize: gameData.install_size || 0,
            runner: 'gog',
            isInstalled: true,
            // GOG covers would need separate handling
        })
    }

    console.log(`[Heroic] Found ${games.length} GOG games`)
    return games
}

// ═══════════════════════════════════════════════════════════
// Sideloaded Apps Scanner
// ═══════════════════════════════════════════════════════════

interface SideloadApp {
    app_name: string
    title: string
    install: {
        executable: string
        install_path: string
        install_size?: number
        platform?: string
    }
    art_square?: string
    art_cover?: string
}

function scanSideloadApps(dataPath: string): HeroicGame[] {
    const libraryPath = join(dataPath, 'sideload_apps/library.json')

    const library = safeReadJson<SideloadApp[]>(libraryPath)
    if (!library || !Array.isArray(library)) return []

    const games: HeroicGame[] = []

    for (const app of library) {
        games.push({
            appName: app.app_name,
            title: app.title || app.app_name,
            installPath: app.install.install_path,
            executable: app.install.executable,
            platform: app.install.platform || 'Windows',
            installSize: app.install.install_size || 0,
            runner: 'sideload',
            isInstalled: true,
            coverUrl: app.art_cover || app.art_square,
        })
    }

    console.log(`[Heroic] Found ${games.length} sideloaded apps`)
    return games
}

// ═══════════════════════════════════════════════════════════
// Combined Scanner
// ═══════════════════════════════════════════════════════════

export async function scanHeroicGames(): Promise<HeroicGame[]> {
    const dataPath = getHeroicDataPath()
    if (!dataPath) {
        console.log('[Heroic] No Heroic installation found')
        return []
    }

    const epicGames = scanEpicGames(dataPath)
    const gogGames = scanGogGames(dataPath)
    const sideloadGames = scanSideloadApps(dataPath)

    const allGames = [...epicGames, ...gogGames, ...sideloadGames]
    console.log(`[Heroic] Scanned ${allGames.length} total games`)

    return allGames
}

// ═══════════════════════════════════════════════════════════
// Cover Path Helper (for cached icons)
// ═══════════════════════════════════════════════════════════

export function getHeroicCoverPath(appName: string): string | null {
    const dataPath = getHeroicDataPath()
    if (!dataPath) return null

    // Check icons directory first
    const iconPath = join(dataPath, 'icons', `${appName}.jpg`)
    if (existsSync(iconPath)) return iconPath

    const pngPath = join(dataPath, 'icons', `${appName}.png`)
    if (existsSync(pngPath)) return pngPath

    return null
}
