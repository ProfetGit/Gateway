import { ipcMain, shell, dialog, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { JsonStore } from '../../shared/store'
import { Game } from '../../shared/types'

export function setupLibraryHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    // Game CRUD operations
    ipcMain.handle('get-games', () => {
        return store.get('games')
    })

    ipcMain.handle('add-game', (_event, gameData: Omit<Game, 'id'>) => {
        const games = store.get('games')
        const newGame: Game = {
            ...gameData,
            id: uuidv4(),
        }
        games.push(newGame)
        store.set('games', games)
        return newGame
    })

    ipcMain.handle('update-game', (_event, id: string, updates: Partial<Game>) => {
        const games = store.get('games')
        const index = games.findIndex(g => g.id === id)
        if (index !== -1) {
            games[index] = { ...games[index], ...updates }
            store.set('games', games)
            return games[index]
        }
        throw new Error('Game not found')
    })

    ipcMain.handle('delete-game', (_event, id: string) => {
        const games = store.get('games')
        store.set('games', games.filter(g => g.id !== id))
    })

    // Uninstall game
    ipcMain.handle('uninstall-game', async (_event, game: Game) => {
        // Steam games
        if (game.steamAppId) {
            await shell.openExternal(`steam://uninstall/${game.steamAppId}`)
            return { success: true }
        }
        return { success: false, error: 'Uninstall not supported for this game type' }
    })

    // Launch game
    ipcMain.handle('launch-game', async (_event, game: Game) => {
        const { exec } = await import('child_process')

        // ════════════════════════════════════════════════════════════════════
        // Build environment variables prefix
        // ════════════════════════════════════════════════════════════════════
        const envVars: string[] = []

        // MangoHud
        if (game.mangoHudEnabled) {
            envVars.push('MANGOHUD=1')
        }

        // Custom environment variables
        if (game.customEnvVars?.trim()) {
            envVars.push(game.customEnvVars.trim())
        }

        const envPrefix = envVars.length > 0 ? envVars.join(' ') + ' ' : ''

        // ════════════════════════════════════════════════════════════════════
        // Build gamescope command wrapper
        // ════════════════════════════════════════════════════════════════════
        let gamescopeCmd = ''
        if (game.gamescope?.enabled) {
            const gs = game.gamescope
            const args: string[] = ['gamescope']

            // Resolution
            if (gs.width) args.push(`-w ${gs.width}`)
            if (gs.height) args.push(`-h ${gs.height}`)
            if (gs.outputWidth) args.push(`-W ${gs.outputWidth}`)
            if (gs.outputHeight) args.push(`-H ${gs.outputHeight}`)

            // Display mode
            if (gs.fullscreen) args.push('-f')
            if (gs.borderless) args.push('-b')

            // Scaler mode
            if (gs.scaler) args.push(`-S ${gs.scaler}`)

            // Filter/upscaling
            if (gs.filter) args.push(`-F ${gs.filter}`)
            if (gs.fsr && !gs.filter) args.push('--fsr') // Legacy flag
            if (gs.fsrSharpness !== undefined) args.push(`--fsr-sharpness ${gs.fsrSharpness}`)
            if (gs.nisSharpness !== undefined) args.push(`--nis-sharpness ${gs.nisSharpness}`)

            // Frame limiting
            if (gs.fpsLimit) args.push(`-r ${gs.fpsLimit}`)
            if (gs.unfocusedFpsLimit) args.push(`-o ${gs.unfocusedFpsLimit}`)

            // Other options
            if (gs.exposeWayland) args.push('--expose-wayland')
            if (gs.hdr) args.push('--hdr-enabled')
            if (gs.forceGrabCursor) args.push('--force-grab-cursor')
            if (gs.adaptiveSync || gs.vrr) args.push('--adaptive-sync')

            gamescopeCmd = args.join(' ') + ' -- '
        }

        // ════════════════════════════════════════════════════════════════════
        // Build gamemode prefix (Feral GameMode)
        // ════════════════════════════════════════════════════════════════════
        const gamemodePrefix = game.gamemodeEnabled ? 'gamemoderun ' : ''

        // ════════════════════════════════════════════════════════════════════
        // Build final command based on game source
        // ════════════════════════════════════════════════════════════════════
        const needsShell = envPrefix || gamescopeCmd || gamemodePrefix

        // Lutris games
        if (game.lutrisId) {
            if (needsShell) {
                const cmd = `${envPrefix}${gamescopeCmd}${gamemodePrefix}lutris lutris:rungameid/${game.lutrisId}`
                exec(cmd, (error) => {
                    if (error) console.error('Failed to launch Lutris game:', error)
                })
            } else {
                await shell.openExternal(`lutris:rungameid/${game.lutrisId}`)
            }
        }
        // Steam games
        else if (game.steamAppId) {
            // NOTE: Gamescope cannot wrap steam:// protocol launches because Steam is
            // typically already running as a daemon. The steam:// URI just signals the
            // existing Steam client, which doesn't spawn a child process under gamescope.
            // For Steam games, users should configure gamescope via Steam's own launch options.
            if (gamescopeCmd) {
                console.warn('[Gateway] Gamescope is not compatible with steam:// protocol launches. Disabling gamescope for this Steam game. To use gamescope, configure it in Steam\'s game properties instead.')
            }

            if (envPrefix || gamemodePrefix) {
                // We can still apply MangoHud and GameMode via env vars
                const cmd = `${envPrefix}${gamemodePrefix}steam steam://rungameid/${game.steamAppId}`
                exec(cmd, (error) => {
                    if (error) console.error('Failed to launch Steam game:', error)
                })
            } else {
                await shell.openExternal(`steam://rungameid/${game.steamAppId}`)
            }
        }
        // Manual executable
        else if (game.executablePath) {
            const args = game.launchArgs || ''
            const cmd = `${envPrefix}${gamescopeCmd}${gamemodePrefix}"${game.executablePath}" ${args}`
            exec(cmd, (error) => {
                if (error) console.error('Failed to launch game:', error)
            })
        }

        // Update last played
        const games = store.get('games')
        const index = games.findIndex(g => g.id === game.id)
        if (index !== -1) {
            games[index].lastPlayed = new Date().toISOString()
            store.set('games', games)
        }
    })

    // Open URL in default browser
    ipcMain.handle('open-url', async (_event, url: string) => {
        console.log('[Main] Opening URL:', url)
        await shell.openExternal(url)
    })

    // Open Steam store page in Steam app
    ipcMain.handle('open-steam-store', async (_event, appId: string) => {
        console.log('[Main] Opening Steam store for appId:', appId)
        await shell.openExternal(`steam://store/${appId}`)
    })

    // Install a Steam game (opens Steam install dialog)
    ipcMain.handle('install-steam-game', async (_event, appId: string) => {
        await shell.openExternal(`steam://install/${appId}`)
    })

    // File dialogs
    ipcMain.handle('select-executable', async () => {
        const win = getMainWindow()
        if (!win) return null
        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile'],
            filters: [
                { name: 'Executables', extensions: ['exe', 'sh', 'AppImage', ''] },
                { name: 'All Files', extensions: ['*'] },
            ],
        })
        return result.canceled ? null : result.filePaths[0]
    })

    ipcMain.handle('select-image', async () => {
        const win = getMainWindow()
        if (!win) return null
        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile'],
            filters: [
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
            ],
        })
        return result.canceled ? null : result.filePaths[0]
    })
}
