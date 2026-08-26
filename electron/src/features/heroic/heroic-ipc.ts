import { ipcMain, BrowserWindow } from 'electron'
import { JsonStore } from '../../shared/store'
import { getHeroicStatus } from './heroic-scanner'
import { performHeroicSync } from './heroic-sync'

export function setupHeroicHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    ipcMain.handle('get_heroic_status', () => getHeroicStatus())

    ipcMain.handle('sync_heroic', async () => {
        const games = await performHeroicSync(store)
        getMainWindow()?.webContents.send('games-updated', games)
        return games
    })
}
