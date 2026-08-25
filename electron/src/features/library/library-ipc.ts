import { ipcMain, shell, dialog, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { JsonStore } from '../../shared/store'
import { Game } from '../../shared/types'

export function setupLibraryHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    // Game CRUD operations
    ipcMain.handle('get_games', () => {
        return store.get('games')
    })

    ipcMain.handle('add_game', (_event, { game: gameData }: { game: Omit<Game, 'id'> }) => {
        const games = store.get('games')
        const newGame: Game = {
            ...gameData,
            id: uuidv4(),
        }
        games.push(newGame)
        store.set('games', games)
        return newGame
    })

    ipcMain.handle('update_game', (_event, { id, updates }: { id: string; updates: Partial<Game> }) => {
        const games = store.get('games')
        const index = games.findIndex(g => g.id === id)
        if (index !== -1) {
            const merged = { ...games[index], ...updates } as Game
            // An explicit `undefined` means "clear this field" (e.g. removing a
            // Steam match). Spreading leaves the key present-but-undefined,
            // which JSON.stringify would drop silently on write but which keeps
            // the stale value visible in the object returned to the renderer.
            for (const key of Object.keys(updates) as Array<keyof Game>) {
                if (updates[key] === undefined) delete merged[key]
            }
            games[index] = merged
            store.set('games', games)
            return games[index]
        }
        throw new Error('Game not found')
    })

    ipcMain.handle('delete_game', (_event, { id }: { id: string }) => {
        const games = store.get('games')
        store.set('games', games.filter(g => g.id !== id))
    })

    // Uninstall game
    ipcMain.handle('uninstall_game', async (_event, { game }: { game: Game }) => {
        if (game.steamAppId) {
            await shell.openExternal(`steam://uninstall/${game.steamAppId}`)
            return { success: true }
        }
        return { success: false, error: 'Uninstall not supported for this game type' }
    })

    // Launch game
    ipcMain.handle('launch_game', async (_event, { game }: { game: Game }) => {
        const { spawn } = await import('child_process')

        const envPrefix = game.customEnvVars?.trim() ?? ''
        const args = game.launchArgs || ''

        // steamAppId only — metadataAppId is a metadata match, NOT ownership,
        // so steam://rungameid would fail for it.
        if (game.steamAppId) {
            await shell.openExternal(`steam://rungameid/${game.steamAppId}`)
        } else if (game.executablePath) {
            const env: NodeJS.ProcessEnv = { ...process.env }
            for (const pair of envPrefix.split(/\s+/).filter(Boolean)) {
                const eq = pair.indexOf('=')
                if (eq > 0) env[pair.slice(0, eq)] = pair.slice(eq + 1)
            }
            const argv = args.split(/\s+/).filter(Boolean)
            const isWindowsExe = /\.(exe|msi|bat)$/i.test(game.executablePath)

            if (isWindowsExe) {
                // Windows executable — needs wine.
                const wine = spawn('wine', [game.executablePath, ...argv], { env, detached: true, stdio: 'ignore' })
                wine.on('error', (error) => {
                    console.error('Failed to launch via wine (is wine installed?):', error)
                })
                wine.unref()
            } else {
                // Native Linux binary/script (e.g. a Lutris/Bottles/faugus-launcher
                // shortcut imported from Steam) — run it directly, no wine.
                const proc = spawn(game.executablePath, argv, { env, detached: true, stdio: 'ignore' })
                proc.on('error', (error) => {
                    console.error('Failed to launch game:', error)
                })
                proc.unref()
            }
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
    ipcMain.handle('open_url', async (_event, { url }: { url: string }) => {
        console.log('[Main] Opening URL:', url)
        await shell.openExternal(url)
    })

    // Open Steam store page in Steam app
    ipcMain.handle('open_steam_store', async (_event, { appId }: { appId: string }) => {
        console.log('[Main] Opening Steam store for appId:', appId)
        await shell.openExternal(`steam://store/${appId}`)
    })

    // Install a Steam game (opens Steam install dialog)
    ipcMain.handle('install_steam_game', async (_event, { appId }: { appId: string }) => {
        await shell.openExternal(`steam://install/${appId}`)
    })

    // File dialogs
    ipcMain.handle('select_executable', async () => {
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

    ipcMain.handle('select_image', async () => {
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
