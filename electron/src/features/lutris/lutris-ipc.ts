import { ipcMain, BrowserWindow } from 'electron'
import { JsonStore } from '../../shared/store'
import { getLutrisStatus } from './lutris-scanner'
import { performLutrisSync } from './lutris-sync'

export function setupLutrisHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    ipcMain.handle('get_lutris_status', () => getLutrisStatus())

    ipcMain.handle('sync_lutris', async () => {
        const games = await performLutrisSync(store)
        getMainWindow()?.webContents.send('games-updated', games)
        return games
    })
}
