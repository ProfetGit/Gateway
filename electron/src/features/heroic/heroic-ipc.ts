import { ipcMain, shell, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { JsonStore } from '../../shared/store'
import { Game, HeroicGame } from '../../shared/types'
import {
    getHeroicStatus,
    scanHeroicGames,
    getHeroicCoverPath,
} from './heroic-scanner'

// ═══════════════════════════════════════════════════════════
// Convert Heroic game to Gateway Game format
// ═══════════════════════════════════════════════════════════

function convertHeroicGame(heroicGame: HeroicGame): Omit<Game, 'id'> {
    // Get local cover art path
    const localCoverPath = getHeroicCoverPath(heroicGame.appName)

    return {
        title: heroicGame.title,
        source: 'heroic',
        heroicAppName: heroicGame.appName,
        heroicRunner: heroicGame.runner,
        isInstalled: heroicGame.isInstalled,
        isFavorite: false,
        sizeOnDisk: heroicGame.installSize,
        executablePath: heroicGame.installPath,
        localCoverPath: localCoverPath || undefined,
        coverUrl: heroicGame.coverUrl,
        heroImageUrl: heroicGame.heroUrl,
    }
}

// ═══════════════════════════════════════════════════════════
// Sync Heroic games into store
// ═══════════════════════════════════════════════════════════

export async function performHeroicSync(
    store: JsonStore,
    _existingSteamAppIds: Set<string>
): Promise<Game[]> {
    const heroicGames = await scanHeroicGames()
    const currentGames = store.get('games')

    if (heroicGames.length === 0) {
        console.log('[Heroic] No games found in Heroic')
        return currentGames
    }

    console.log(`[Heroic] Found ${heroicGames.length} games to sync`)

    // Build a map of existing Heroic games by heroicAppName for efficient lookup
    const existingHeroicMap = new Map<string, Game>()
    for (const game of currentGames) {
        if (game.heroicAppName) {
            existingHeroicMap.set(game.heroicAppName, game)
        }
    }

    const mergedGames: Game[] = []
    const processedAppNames = new Set<string>()

    // Add/update Heroic games
    for (const hg of heroicGames) {
        processedAppNames.add(hg.appName)
        const existing = existingHeroicMap.get(hg.appName)
        const converted = convertHeroicGame(hg)

        if (existing) {
            // Update existing game, preserve user-set fields
            mergedGames.push({
                ...existing,
                ...converted,
                isFavorite: existing.isFavorite, // Preserve
                notes: existing.notes, // Preserve
            })
        } else {
            // New game
            mergedGames.push({
                ...converted,
                id: uuidv4(),
            })
        }
    }

    // Keep non-Heroic games
    for (const game of currentGames) {
        if (game.source !== 'heroic') {
            // Keep all non-Heroic games
            if (!mergedGames.some(g => g.id === game.id)) {
                mergedGames.push(game)
            }
        } else if (game.heroicAppName && !processedAppNames.has(game.heroicAppName)) {
            // Heroic game no longer exists - skip it (removed from Heroic)
            console.log(`[Heroic] Removing game no longer in Heroic: ${game.title}`)
        }
    }

    store.set('games', mergedGames)
    console.log(`[Heroic] ✓ Sync complete. Total games: ${mergedGames.length}`)

    return mergedGames
}

// ═══════════════════════════════════════════════════════════
// IPC Handlers
// ═══════════════════════════════════════════════════════════

export function setupHeroicHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    // Get Heroic installation status
    ipcMain.handle('get-heroic-status', async () => {
        try {
            return await getHeroicStatus()
        } catch (error) {
            console.error('[Heroic] Failed to get status:', error)
            return {
                installed: false,
                version: null,
                dataPath: null,
                gamesCount: 0,
                epicCount: 0,
                gogCount: 0,
                sideloadCount: 0,
            }
        }
    })

    // Sync Heroic games
    ipcMain.handle('sync-heroic', async () => {
        try {
            // Build set of existing Steam app IDs to avoid duplicates
            const currentGames = store.get('games')
            const steamAppIds = new Set<string>()
            for (const game of currentGames) {
                if (game.steamAppId) {
                    steamAppIds.add(game.steamAppId)
                }
            }

            const games = await performHeroicSync(store, steamAppIds)

            // Notify renderer of update
            const win = getMainWindow()
            if (win) {
                win.webContents.send('games-updated', games)
            }

            return games
        } catch (error) {
            console.error('[Heroic] Sync failed:', error)
            // Return current games instead of failing
            return store.get('games')
        }
    })

    // Launch Heroic game
    ipcMain.handle('launch-heroic-game', async (_event, appName: string) => {
        try {
            // Heroic uses heroic://launch/runner/appName format
            // Need to determine the runner from stored game data
            const games = store.get('games')
            const game = games.find(g => g.heroicAppName === appName)

            if (!game) {
                console.error('[Heroic] Game not found:', appName)
                return { success: false, error: 'Game not found' }
            }

            const runner = game.heroicRunner || 'legendary'
            const launchUri = `heroic://launch/${runner}/${appName}`

            console.log(`[Heroic] Launching: ${launchUri}`)
            await shell.openExternal(launchUri)

            return { success: true }
        } catch (error) {
            console.error('[Heroic] Failed to launch game:', error)
            return { success: false, error: String(error) }
        }
    })

    // Install Heroic game (opens Heroic so user can install manually)
    // Note: Heroic doesn't support install via URI scheme, only launch
    ipcMain.handle('install-heroic-game', async (_event, appName: string, runner?: string) => {
        try {
            // Heroic doesn't have an install URI scheme, so we just open Heroic
            // The user will need to navigate to the game and click install
            console.log(`[Heroic] Opening Heroic for game: ${appName} (runner: ${runner || 'unknown'})`)

            // Try to open Heroic launcher (this will just open the app)
            await shell.openExternal('heroic://')

            return { success: true }
        } catch (error) {
            console.error('[Heroic] Failed to open Heroic:', error)
            return { success: false, error: String(error) }
        }
    })
}
