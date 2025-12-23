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
        // Lutris games
        if (game.lutrisId) {
            await shell.openExternal(`lutris:rungameid/${game.lutrisId}`)
        }
        // Steam games
        else if (game.steamAppId) {
            await shell.openExternal(`steam://rungameid/${game.steamAppId}`)
        }
        // Manual executable
        else if (game.executablePath) {
            const { exec } = await import('child_process')
            const args = game.launchArgs || ''
            exec(`"${game.executablePath}" ${args}`, (error) => {
                if (error) {
                    console.error('Failed to launch game:', error)
                }
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
