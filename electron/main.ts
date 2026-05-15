import { app, BrowserWindow, protocol, net, ipcMain } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import { JsonStore } from './src/shared/store'
import { mirrorAllCovers } from './src/shared/utils'
import { STEAM_API_KEY } from './src/shared/constants'
import { setSteamApiKey, initAuth, refreshSessionOnStartup } from './steamAuth'
import { setupSteamApiHandlers } from './src/features/steam/steam-api'
import { setupLibraryHandlers } from './src/features/library/library-ipc'
import { setupSyncHandlers, checkPendingClaims } from './src/features/sync/sync-ipc'
import { setupLutrisHandlers } from './src/features/lutris/lutris-ipc'
import { setupHeroicHandlers } from './src/features/heroic/heroic-ipc'
import { setupSetupHandlers } from './src/features/setup/setup-ipc'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

// Directory structure
process.env.APP_ROOT = path.join(__dirname, '..')

export const VITE_DEV_SERVER_URL = process.env['VITE_DEV_SERVER_URL']
export const MAIN_DIST = path.join(process.env.APP_ROOT, 'dist-electron')
export const RENDERER_DIST = path.join(process.env.APP_ROOT, 'dist')

process.env.VITE_PUBLIC = VITE_DEV_SERVER_URL ? path.join(process.env.APP_ROOT, 'public') : RENDERER_DIST

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
      preload: path.join(__dirname, 'preload.cjs'), // Preload path assumes typical Electron build
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

  // Register custom protocol for local assets
  protocol.handle('gateway', (request) => {
    const url = request.url.replace('gateway://', '')
    const [type, fileName] = url.split('/')

    if (type === 'cover' && fileName) {
      const userDataPath = app.getPath('userData')
      const filePath = path.join(userDataPath, 'assets', 'covers', fileName)
      return net.fetch(`file://${filePath}`)
    }

    return new Response('Not Found', { status: 404 })
  })

  // Resolve Steam API key. Priority: env var > user-saved key in store.
  // Env var is for developers / power users; store is the normal user path
  // populated via Setup wizard or Settings panel.
  const storedKey = store.get('settings')?.steamApiKey
  const effectiveKey = STEAM_API_KEY || storedKey || ''
  if (effectiveKey) {
    setSteamApiKey(effectiveKey)
  }
  initAuth({
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
  })

  // Validate persisted session cookies in the background. If they expired,
  // the auth state will be cleared so the wizard can re-prompt.
  refreshSessionOnStartup().catch((err) => {
    console.warn('[Main] Session validation skipped:', err)
  })

  // Setup Feature Modules
  const getMainWindow = () => win

  setupSteamApiHandlers()
  setupLibraryHandlers(store, getMainWindow)
  setupSyncHandlers(store, getMainWindow)
  setupLutrisHandlers(store, getMainWindow)
  setupHeroicHandlers(store, getMainWindow)
  setupSetupHandlers(store)

  // Window controls — title-bar buttons in the renderer use these.
  ipcMain.on('minimize-window', () => win?.minimize())
  ipcMain.on('maximize-window', () => {
    if (!win) return
    if (win.isMaximized()) win.unmaximize()
    else win.maximize()
  })
  ipcMain.on('close-window', () => win?.close())

  createWindow()

  // Initial mirroring
  setTimeout(() => mirrorAllCovers(store, win), 5000) // Delay to let app settle
})
