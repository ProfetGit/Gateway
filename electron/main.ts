import { app, BrowserWindow, protocol, net, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { JsonStore } from './src/shared/store'
import { mirrorAllCovers } from './src/shared/utils'
import { pruneOrphanArt } from './src/shared/prune-orphan-art'
import { STEAM_API_KEY } from './src/shared/constants'
import { setSteamApiKey, initAuth, refreshSessionOnStartup } from './steamAuth'
import { setupSteamApiHandlers } from './src/features/steam/steam-api'
import { setupSteamSearchHandlers } from './src/features/steam/steam-search'
import { setupAchievementsHandlers } from './src/features/achievements/achievements-ipc'
import { setupLibraryHandlers } from './src/features/library/library-ipc'
import { setupNotificationHandlers } from './src/features/notifications/notifications-ipc'
import { refreshAchievementWatchers, stopAchievementWatchers } from './src/features/achievements/achievement-watcher'
import { setupSyncHandlers, checkPendingClaims } from './src/features/sync/sync-ipc'
import { setupSetupHandlers } from './src/features/setup/setup-ipc'
import { setupHeroicHandlers } from './src/features/heroic/heroic-ipc'
import { setupLutrisHandlers } from './src/features/lutris/lutris-ipc'
import { setupUpdateHandlers, checkForUpdatesOnStart } from './src/features/updates/updates-ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

// NOTE: the pre-Tauri Electron build set WEBKIT_DISABLE_DMABUF_RENDERER=1 on
// Linux to work around a WebKitGTK/NVIDIA crash. That workaround was actually
// applied to Tauri's WebKitGTK-based webview (src-tauri/src/main.rs); Electron
// uses Chromium, not WebKitGTK, so it isn't affected and no equivalent is
// needed here.

let win: BrowserWindow | null
let store: JsonStore

function createWindow() {
  win = new BrowserWindow({
    width: 1400,
    height: 900,
    minWidth: 1000,
    minHeight: 700,
    frame: false,
    transparent: false,
    backgroundColor: '#000000',
    titleBarStyle: 'hidden',
    title: 'Gateway',
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: true,
    },
  })

  // Keep OS title stable — page <title> changes won't override.
  win.on('page-title-updated', (e) => e.preventDefault())

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', 'Gateway initialized')
  })

  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// Global focus handler for reliability
app.on('browser-window-focus', async () => {
  if (store) {
    await checkPendingClaims(store, win)
  }
})

// App lifecycle
app.on('window-all-closed', () => {
  app.quit()
  win = null
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  store = new JsonStore()

  // Register custom protocol for local art — mirrors the Tauri backend's
  // gateway:// scheme handler (same path layout, mime-by-extension, and
  // cache header). cover/hero/logo each map to their own assets subfolder.
  const GATEWAY_ART_SUBDIRS: Record<string, string> = {
    cover: 'covers',
    hero: 'heroes',
    logo: 'logos',
  }

  protocol.handle('gateway', (request) => {
    const url = request.url.replace('gateway://', '')
    const [type, fileName] = url.split('/')
    const subDir = GATEWAY_ART_SUBDIRS[type]

    if (subDir && fileName) {
      const filePath = path.join(store.getDataDir(), 'assets', subDir, fileName)
      return net.fetch(`file://${filePath}`).then((res) => {
        if (!res.ok) return new Response('Not Found', { status: 404 })
        const mime = fileName.endsWith('.png') ? 'image/png' : 'image/jpeg'
        return new Response(res.body, {
          status: 200,
          headers: {
            'Content-Type': mime,
            'Cache-Control': 'public, max-age=86400',
          },
        })
      })
    }

    return new Response('Not Found', { status: 404 })
  })

  // Resolve Steam API key. Priority: env var > user-saved key in store.
  const storedKey = store.get('settings')?.steamApiKey
  const effectiveKey = STEAM_API_KEY || storedKey || ''
  if (effectiveKey) {
    setSteamApiKey(effectiveKey)
  }
  initAuth({
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
  })

  // Refresh the logged-in user's display data in the background.
  refreshSessionOnStartup()
    .then((fresh) => {
      if (fresh) win?.webContents.send('auth-state-updated', fresh)
    })
    .catch((err) => {
      console.warn('[Main] Session refresh skipped:', err)
    })

  const getMainWindow = () => win

  setupSteamApiHandlers()
  setupSteamSearchHandlers()
  setupAchievementsHandlers(store, getMainWindow)
  setupNotificationHandlers(getMainWindow)
  setupLibraryHandlers(store, getMainWindow)
  setupSyncHandlers(store, getMainWindow)
  setupSetupHandlers(store, getMainWindow)
  setupHeroicHandlers(store, getMainWindow)
  setupLutrisHandlers(store, getMainWindow)
  setupUpdateHandlers(getMainWindow)

  // Window controls — title-bar buttons in the renderer use these.
  ipcMain.handle('window_minimize', () => win?.minimize())
  ipcMain.handle('window_toggle_maximize', () => {
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.handle('window_close', () => win?.close())

  createWindow()

  // Initial mirroring
  setTimeout(() => {
    // Prune first so the cover pass does not re-check files nothing points at.
    try {
      pruneOrphanArt(store)
    } catch (err) {
      console.warn('[Main] Orphan art prune skipped:', err)
    }
    void mirrorAllCovers(store, win)
  }, 5000)

  // Watch for achievements unlocked by games Steam can't report on.
  setTimeout(() => refreshAchievementWatchers(store, win), 6000)

  // Last of the boot timers, so it doesn't compete for I/O during startup.
  setTimeout(checkForUpdatesOnStart, 10000)
})

app.on('will-quit', () => {
  stopAchievementWatchers()
})
