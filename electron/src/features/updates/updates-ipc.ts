import { app, ipcMain, BrowserWindow } from 'electron'
import electronUpdater from 'electron-updater'

// ═══════════════════════════════════════════════════════════
// Auto-update (AppImage)
// ═══════════════════════════════════════════════════════════
//
// electron-updater is CommonJS, so the named export has to come off the
// default import under "type": "module".
//
// Two AppImage-specific facts worth knowing:
//
//  1. autoUpdater needs process.env.APPIMAGE, which is only set when the app
//     is actually running as an AppImage. Under `npm run dev` it is not, and
//     checkForUpdates() throws "application is not packaged" — hence the
//     app.isPackaged guard below.
//  2. The updater rewrites the AppImage IN PLACE, so it needs write access to
//     its own path. Dropped in /opt or /usr/local/bin it will fail. That
//     surfaces as an 'error' status rather than being swallowed, so the
//     Settings panel can actually say so.

const { autoUpdater } = electronUpdater

export function setupUpdateHandlers(getMainWindow: () => BrowserWindow | null) {
    autoUpdater.autoDownload = true
    autoUpdater.autoInstallOnAppQuit = true

    const send = (payload: unknown) =>
        getMainWindow()?.webContents.send('update-status', payload)

    autoUpdater.on('checking-for-update', () => send({ state: 'checking' }))
    autoUpdater.on('update-available', (info) => send({ state: 'available', version: info.version }))
    autoUpdater.on('update-not-available', () => send({ state: 'current' }))
    autoUpdater.on('download-progress', (progress) =>
        send({ state: 'downloading', percent: progress.percent })
    )
    autoUpdater.on('update-downloaded', (info) => send({ state: 'ready', version: info.version }))
    autoUpdater.on('error', (error) => {
        console.error('[Updates] autoUpdater error:', error)
        send({ state: 'error', message: error instanceof Error ? error.message : String(error) })
    })

    ipcMain.handle('check_for_updates', async () => {
        if (!app.isPackaged) {
            return { started: false, reason: 'Updates only run in the installed app' }
        }
        await autoUpdater.checkForUpdates()
        return { started: true }
    })

    ipcMain.handle('install_update', () => {
        autoUpdater.quitAndInstall()
    })
}

export function checkForUpdatesOnStart(): void {
    if (!app.isPackaged) return
    autoUpdater.checkForUpdates().catch((error) => {
        console.warn('[Updates] Startup check skipped:', error)
    })
}
