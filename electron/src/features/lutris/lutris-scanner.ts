import Database from 'better-sqlite3'
import { existsSync } from 'fs'
import { join } from 'path'
import { homedir } from 'os'
import { execSync } from 'child_process'
import { LutrisGame, LutrisStatus } from '../../shared/types'

// ═══════════════════════════════════════════════════════════
// Lutris Data Paths
// ═══════════════════════════════════════════════════════════

const LUTRIS_DATA_PATHS = [
    // Standard installation
    join(homedir(), '.local/share/lutris'),
    // Flatpak installation
    join(homedir(), '.var/app/net.lutris.Lutris/data/lutris'),
]

export function getLutrisDataPath(): string | null {
    for (const path of LUTRIS_DATA_PATHS) {
        if (existsSync(join(path, 'pga.db'))) {
            return path
        }
    }
    return null
}

export function getLutrisBannerPath(slug: string): string | null {
    const dataPath = getLutrisDataPath()
    if (!dataPath) return null

    const bannerPath = join(dataPath, 'banners', `${slug}.jpg`)
    if (existsSync(bannerPath)) return bannerPath

    // Try png fallback
    const pngPath = join(dataPath, 'banners', `${slug}.png`)
    if (existsSync(pngPath)) return pngPath

    return null
}

export function getLutrisCoverPath(slug: string): string | null {
    const dataPath = getLutrisDataPath()
    if (!dataPath) return null

    const coverPath = join(dataPath, 'coverart', `${slug}.jpg`)
    if (existsSync(coverPath)) return coverPath

    // Try png fallback
    const pngPath = join(dataPath, 'coverart', `${slug}.png`)
    if (existsSync(pngPath)) return pngPath

    return null
}

// ═══════════════════════════════════════════════════════════
// Lutris Status Detection
// ═══════════════════════════════════════════════════════════

export async function getLutrisStatus(): Promise<LutrisStatus> {
    const dataPath = getLutrisDataPath()

    // Check if Lutris CLI is available
    let version: string | null = null
    try {
        const output = execSync('lutris --version', { encoding: 'utf-8', timeout: 5000 })
        version = output.trim()
    } catch {
        // Lutris CLI not available
    }

    if (!dataPath) {
        return {
            installed: false,
            version,
            dataPath: null,
            gamesCount: 0,
        }
    }

    // Count games in database
    let gamesCount = 0
    try {
        const dbPath = join(dataPath, 'pga.db')
        const db = new Database(dbPath, { readonly: true })
        const row = db.prepare('SELECT COUNT(*) as count FROM games').get() as { count: number }
        gamesCount = row.count
        db.close()
    } catch (error) {
        console.error('[Lutris] Failed to read database for status:', error)
    }

    return {
        installed: true,
        version,
        dataPath,
        gamesCount,
    }
}

// ═══════════════════════════════════════════════════════════
// Scan Lutris Games from Database
// ═══════════════════════════════════════════════════════════

export async function scanLutrisGames(): Promise<LutrisGame[]> {
    const dataPath = getLutrisDataPath()
    if (!dataPath) {
        return []
    }

    const dbPath = join(dataPath, 'pga.db')
    if (!existsSync(dbPath)) {
        console.log('[Lutris] Database file not found at:', dbPath)
        return []
    }

    try {
        const db = new Database(dbPath, { readonly: true })

        const games = db.prepare(`
            SELECT 
                id, name, slug, runner, installed, directory,
                playtime, lastplayed, configpath, service, service_id
            FROM games
            WHERE name IS NOT NULL AND slug IS NOT NULL
            ORDER BY name ASC
        `).all() as LutrisGame[]

        db.close()
        console.log(`[Lutris] Scanned ${games.length} games from database`)
        return games
    } catch (error) {
        console.error('[Lutris] Failed to read database:', error)
        return []
    }
}

// ═══════════════════════════════════════════════════════════
// Helper: Check if Lutris game is a Steam game (avoid duplicates)
// ═══════════════════════════════════════════════════════════

export function isSteamRunner(game: LutrisGame): boolean {
    return game.runner === 'steam'
}

export function getLutrisGameSteamAppId(game: LutrisGame): string | null {
    // 1. Direct Steam service match
    if (game.service === 'steam' && game.service_id) {
        return game.service_id
    }

    // 2. Steam runner with service_id (usually the AppID)
    if (game.runner === 'steam' && game.service_id) {
        return game.service_id
    }

    // 3. Fallback: Check if slug follows steam-{appId} pattern
    if (game.slug.startsWith('steam-')) {
        const match = game.slug.match(/^steam-(\d+)/)
        if (match) {
            return match[1]
        }
    }

    return null
}

export async function fetchLutrisGameArt(slug: string): Promise<{ coverUrl?: string, bannerUrl?: string, steamAppId?: string } | null> {
    try {
        // Lutris API search
        const response = await fetch(`https://lutris.net/api/games?search=${slug}`)
        if (!response.ok) return null

        const json = await response.json() as any
        const results = json.results || []

        if (Array.isArray(results) && results.length > 0) {
            // Try to find exact slug match first
            const match = results.find((g: any) => g.slug === slug) || results[0]

            // Check if we can find a Steam AppID in provider_games
            let steamAppId: string | undefined
            if (Array.isArray(match.provider_games)) {
                const steamProvider = match.provider_games.find((p: any) => p.service === 'steam')
                if (steamProvider && steamProvider.slug) {
                    steamAppId = steamProvider.slug
                }
            }

            return {
                coverUrl: match.coverart || undefined,
                bannerUrl: match.banner_url || undefined,
                steamAppId
            }
        }
    } catch (error) {
        console.warn(`[Lutris] Failed to fetch art for ${slug}:`, error)
    }
    return null
}
