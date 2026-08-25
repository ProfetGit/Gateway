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
            games[index] = { ...games[index], ...updates }
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
        const { spawn, exec } = await import('child_process')

        const envPrefix = game.customEnvVars?.trim() ?? ''
        const args = game.launchArgs || ''

        if (game.steamAppId) {
            await shell.openExternal(`steam://rungameid/${game.steamAppId}`)
        } else if (game.executablePath) {
            if (process.platform === 'win32') {
                const cmd = envPrefix
                    ? `${envPrefix} "${game.executablePath}" ${args}`
                    : `"${game.executablePath}" ${args}`
                exec(cmd, (error) => {
                    if (error) console.error('Failed to launch game:', error)
                })
            } else {
                // Non-Windows: run the Windows executable via wine.
                const env: NodeJS.ProcessEnv = { ...process.env }
                for (const pair of envPrefix.split(/\s+/).filter(Boolean)) {
                    const eq = pair.indexOf('=')
                    if (eq > 0) env[pair.slice(0, eq)] = pair.slice(eq + 1)
                }
                const argv = args.split(/\s+/).filter(Boolean)
                const wine = spawn('wine', [game.executablePath, ...argv], { env, detached: true, stdio: 'ignore' })
                wine.on('error', (error) => {
                    console.error('Failed to launch via wine (is wine installed?):', error)
                })
                wine.unref()
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
