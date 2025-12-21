import { app, BrowserWindow, ipcMain, dialog, shell } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { v4 as uuidv4 } from 'uuid'
import { steamService } from './steamService'
import { setSteamApiKey, loginWithSteam, logout, getAuthState, fetchOwnedGames, hasApiKey, initAuth } from './steamAuth'

// Steam API key (configured after store is created)
const STEAM_API_KEY = process.env.STEAM_API_KEY || '663994EA064069331B86FD6D3CCADDB5'


const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface Game {
  id: string
  title: string
  coverUrl?: string
  executablePath?: string
  steamAppId?: string
  isInstalled: boolean
  isFavorite: boolean
  source: 'manual' | 'steam'
  playtime?: number
  lastPlayed?: string
  notes?: string
  launchArgs?: string
}

interface SteamAuthData {
  isLoggedIn: boolean
  user: {
    steamId: string
    username: string
    avatarUrl: string
    profileUrl: string
  } | null
}

interface StoreData {
  games: Game[]
  settings: {
    steamPath: string
  }
  steamAuth?: SteamAuthData
}

// Simple JSON file store
class JsonStore {
  private filePath: string
  private data: StoreData

  constructor() {
    const userDataPath = app.getPath('userData')
    this.filePath = path.join(userDataPath, 'gateway-data.json')
    this.data = this.load()
  }

  private load(): StoreData {
    try {
      if (fs.existsSync(this.filePath)) {
        const content = fs.readFileSync(this.filePath, 'utf-8')
        return JSON.parse(content)
      }
    } catch (error) {
      console.error('Failed to load store:', error)
    }
    return {
      games: [],
      settings: { steamPath: '' }
    }
  }

  private save(): void {
    try {
      fs.writeFileSync(this.filePath, JSON.stringify(this.data, null, 2))
    } catch (error) {
      console.error('Failed to save store:', error)
    }
  }

  get<K extends keyof StoreData>(key: K): StoreData[K] {
    return this.data[key]
  }

  set<K extends keyof StoreData>(key: K, value: StoreData[K]): void {
    this.data[key] = value
    this.save()
  }
}

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
    icon: path.join(process.env.VITE_PUBLIC!, 'icon.png'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.cjs'),
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      devTools: true, // Enable DevTools
    },
  })

  win.webContents.on('did-finish-load', () => {
    win?.webContents.send('main-process-message', 'Gateway initialized')
  })

  // Open DevTools in development mode
  if (VITE_DEV_SERVER_URL) {
    win.loadURL(VITE_DEV_SERVER_URL)
    win.webContents.openDevTools() // Auto-open DevTools
  } else {
    win.loadFile(path.join(RENDERER_DIST, 'index.html'))
  }
}

// ═══════════════════════════════════════════════════════════
// IPC Handlers
// ═══════════════════════════════════════════════════════════

function setupIpcHandlers() {
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

  // Launch game
  ipcMain.handle('launch-game', async (_event, game: Game) => {
    if (game.steamAppId) {
      await shell.openExternal(`steam://rungameid/${game.steamAppId}`)
    } else if (game.executablePath) {
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

  // Steam sync - using robust Steam service
  ipcMain.handle('sync-steam', async () => {
    console.log('[Main] sync-steam IPC handler called')
    try {
      const status = steamService.initialize()
      console.log('[Main] Steam status:', status)
      const newGames = steamService.syncWithStore(store)
      console.log('[Main] Sync complete, new games:', newGames.length)

      // If logged in, resolve game names from Steam API
      const auth = getAuthState()
      if (auth.isLoggedIn && auth.user) {
        console.log('[Main] User is logged in, fetching game names from API...')
        const apiResult = await fetchOwnedGames(auth.user.steamId)
        if (apiResult.success && apiResult.games.length > 0) {
          const existingGames = store.get('games')
          const updatedGames = existingGames.map(game => {
            if (game.steamAppId) {
              const apiGame = apiResult.games.find(g => g.appId === game.steamAppId)
              if (apiGame && apiGame.name && game.title.startsWith('Game ')) {
                return { ...game, title: apiGame.name }
              }
            }
            return game
          })
          store.set('games', updatedGames)
          console.log('[Main] ✓ Game names updated from API')
        } else if (!apiResult.success) {
          console.warn('[Main] Could not fetch game names from API:', apiResult.error)
        }
      }

      return newGames
    } catch (error) {
      console.error('[Main] sync-steam error:', error)
      throw error
    }
  })

  // Get Steam installation status
  ipcMain.handle('get-steam-status', () => {
    return steamService.getStatus()
  })

  // Clear all games and re-fetch from Steam API (fresh start)
  ipcMain.handle('clear-and-resync', async () => {
    console.log('[Main] clear-and-resync called')

    const auth = getAuthState()
    if (!auth.isLoggedIn || !auth.user) {
      return { success: false, error: 'Not logged in. Please login with Steam first.' }
    }

    // Clear all games
    store.set('games', [])
    console.log('[Main] Cleared all games from store')

    // Get installed games from local Steam files
    steamService.initialize()
    const installedAppIds = new Set<string>()

    // Get installed games to know install status
    const libraryPaths = steamService.getStatus().libraryPaths
    for (const libPath of libraryPaths) {
      const appsPath = path.join(libPath, 'steamapps')
      try {
        const files = fs.readdirSync(appsPath)
        for (const file of files) {
          if (file.startsWith('appmanifest_') && file.endsWith('.acf')) {
            const appId = file.replace('appmanifest_', '').replace('.acf', '')
            installedAppIds.add(appId)
          }
        }
      } catch {
        // Skip if can't read directory
      }
    }
    console.log('[Main] Found', installedAppIds.size, 'installed games')

    // Fetch all games from Steam API
    const apiResult = await fetchOwnedGames(auth.user.steamId)

    if (!apiResult.success) {
      return { success: false, error: apiResult.error }
    }

    // Create game entries from API data with install status
    const games = apiResult.games.map(g => ({
      id: uuidv4(),
      title: g.name,
      steamAppId: g.appId,
      coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${g.appId}/library_600x900.jpg`,
      isInstalled: installedAppIds.has(g.appId),
      isFavorite: false,
      source: 'steam' as const,
      playtime: g.playtime,
    }))

    store.set('games', games)
    console.log('[Main] ✓ Re-synced', games.length, 'games from Steam API')

    return {
      success: true,
      totalGames: games.length,
      installedGames: games.filter(g => g.isInstalled).length
    }
  })

  // Install a Steam game (opens Steam install dialog)
  ipcMain.handle('install-steam-game', async (_event, appId: string) => {
    await shell.openExternal(`steam://install/${appId}`)
  })


  // ═══════════════════════════════════════════════════════════
  // Steam Authentication
  // ═══════════════════════════════════════════════════════════

  // Login with Steam - auto-syncs games after successful login
  ipcMain.handle('steam-login', async () => {
    console.log('[Main] steam-login IPC handler called')
    try {
      const authState = await loginWithSteam()
      console.log('[Main] Login successful:', authState.user?.username)

      // Auto-sync games after login
      if (authState.isLoggedIn && authState.user) {
        console.log('[Main] Auto-syncing games after login...')

        // First sync local Steam files (always works)
        steamService.initialize()
        steamService.syncWithStore(store)
        console.log('[Main] ✓ Local files synced')

        // Then try to fetch games via API (has proper names)
        const apiResult = await fetchOwnedGames(authState.user.steamId)

        if (apiResult.success && apiResult.games.length > 0) {
          console.log('[Main] Updating game names from Steam API...')
          const existingGames = store.get('games')

          // Update game names from API data
          const updatedGames = existingGames.map(game => {
            if (game.steamAppId) {
              const apiGame = apiResult.games.find(g => g.appId === game.steamAppId)
              if (apiGame && apiGame.name) {
                return { ...game, title: apiGame.name }
              }
            }
            return game
          })

          // Also add any games from API that aren't in the store
          const existingAppIds = new Set(existingGames.filter(g => g.steamAppId).map(g => g.steamAppId))
          const newGames = apiResult.games
            .filter(g => !existingAppIds.has(g.appId))
            .map(g => ({
              id: uuidv4(),
              title: g.name,
              steamAppId: g.appId,
              coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${g.appId}/library_600x900.jpg`,
              isInstalled: false,
              isFavorite: false,
              source: 'steam' as const,
              playtime: g.playtime,
            }))

          if (newGames.length > 0) {
            console.log('[Main] Adding', newGames.length, 'new games from Steam API')
          }

          store.set('games', [...updatedGames, ...newGames])
          console.log('[Main] ✓ Auto-sync complete with API data')
        } else if (!apiResult.success) {
          // API failed but local sync worked - just log, don't fail
          console.warn('[Main] Steam API fetch failed:', apiResult.error)
          console.log('[Main] ✓ Auto-sync complete with local files only')
        }
      }

      return authState
    } catch (error) {
      console.error('[Main] steam-login error:', error)
      throw error
    }
  })

  // Logout
  ipcMain.handle('steam-logout', () => {
    logout()
    return getAuthState()
  })

  // Get auth state
  ipcMain.handle('get-auth-state', () => {
    return getAuthState()
  })

  // Check if API key is configured
  ipcMain.handle('has-steam-api-key', () => {
    return hasApiKey()
  })

  // Fetch owned games via Steam API and sync to store
  ipcMain.handle('fetch-steam-games', async () => {
    const auth = getAuthState()
    if (!auth.isLoggedIn || !auth.user) {
      return { success: false, error: 'Not logged in', games: [] }
    }

    const apiResult = await fetchOwnedGames(auth.user.steamId)

    if (!apiResult.success) {
      console.warn('[Main] fetch-steam-games failed:', apiResult.error)
      return apiResult
    }

    if (apiResult.games.length > 0) {
      console.log('[Main] Syncing', apiResult.games.length, 'games from Steam API')
      const existingGames = store.get('games')

      // Update existing games with proper names
      const updatedGames = existingGames.map(game => {
        if (game.steamAppId) {
          const apiGame = apiResult.games.find(g => g.appId === game.steamAppId)
          if (apiGame && apiGame.name) {
            return { ...game, title: apiGame.name }
          }
        }
        return game
      })

      // Add any new games from API
      const existingAppIds = new Set(existingGames.filter(g => g.steamAppId).map(g => g.steamAppId))
      // Using imported uuidv4
      const newGames = apiResult.games
        .filter(g => !existingAppIds.has(g.appId))
        .map(g => ({
          id: uuidv4(),
          title: g.name,
          steamAppId: g.appId,
          coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${g.appId}/library_600x900.jpg`,
          isInstalled: false,
          isFavorite: false,
          source: 'steam' as const,
          playtime: g.playtime,
        }))

      store.set('games', [...updatedGames, ...newGames])
      console.log('[Main] ✓ Synced games. Updated:', updatedGames.length, 'New:', newGames.length)
    }

    return apiResult
  })

  // File dialogs
  ipcMain.handle('select-executable', async () => {
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
    if (!win) return null
    const result = await dialog.showOpenDialog(win, {
      properties: ['openFile'],
      filters: [
        { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
      ],
    })
    return result.canceled ? null : result.filePaths[0]
  })

  // Window controls
  ipcMain.on('minimize-window', () => win?.minimize())
  ipcMain.on('maximize-window', () => {
    if (win?.isMaximized()) {
      win.unmaximize()
    } else {
      win?.maximize()
    }
  })
  ipcMain.on('close-window', () => win?.close())
}

// parseLibraryFolders moved to steamService.ts

// App lifecycle
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
    win = null
  }
})

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) {
    createWindow()
  }
})

app.whenReady().then(() => {
  store = new JsonStore()

  // Initialize Steam auth with persistent storage
  if (STEAM_API_KEY) {
    setSteamApiKey(STEAM_API_KEY)
  }
  initAuth({
    get: (key) => store.get(key),
    set: (key, value) => store.set(key, value),
  })

  setupIpcHandlers()
  createWindow()
})
