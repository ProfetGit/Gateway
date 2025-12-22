import { app, BrowserWindow, ipcMain, dialog, shell, protocol, net } from 'electron'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import fs from 'node:fs'
import { v4 as uuidv4 } from 'uuid'
import { steamService } from './steamService'
import { setSteamApiKey, loginWithSteam, logout, getAuthState, fetchOwnedGames, hasApiKey, initAuth, fetchPlayerAchievements } from './steamAuth'

// Steam API key (configured after store is created)
const STEAM_API_KEY = process.env.STEAM_API_KEY || '663994EA064069331B86FD6D3CCADDB5'


const __dirname = path.dirname(fileURLToPath(import.meta.url))

interface Game {
  id: string
  title: string
  coverUrl?: string
  localCoverPath?: string
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

// ═══════════════════════════════════════════════════════════
// Helpers
// ═══════════════════════════════════════════════════════════

async function downloadGameCover(game: Game): Promise<string | null> {
  if (!game.coverUrl || game.localCoverPath) return game.localCoverPath || null

  try {
    const userDataPath = app.getPath('userData')
    const coversDir = path.join(userDataPath, 'assets', 'covers')

    if (!fs.existsSync(coversDir)) {
      fs.mkdirSync(coversDir, { recursive: true })
    }

    const fileName = `${game.steamAppId || game.id}.jpg`
    const filePath = path.join(coversDir, fileName)

    // Skip if already exists
    if (fs.existsSync(filePath)) {
      return fileName
    }

    const response = await fetch(game.coverUrl)
    const arrayBuffer = await response.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)
    fs.writeFileSync(filePath, buffer)

    return fileName
  } catch (error) {
    console.error(`Failed to download cover for ${game.title}:`, error)
    return null
  }
}

async function mirrorAllCovers() {
  console.log('[Main] Mirroring covers in background...')
  const games = store.get('games')
  let updated = false

  for (const game of games) {
    if (game.coverUrl && !game.localCoverPath) {
      const fileName = await downloadGameCover(game)
      if (fileName) {
        game.localCoverPath = fileName
        updated = true
      }
    }
  }

  if (updated) {
    store.set('games', games)
    console.log('[Main] ✓ Mirroring complete, store updated')
    // Notify renderer if window is open
    win?.webContents.send('games-updated', games)
  }
}

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
    } finally {
      // Trigger mirroring in background
      mirrorAllCovers()
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
      coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${g.appId}/library_600x900_2x.jpg`,
      isInstalled: installedAppIds.has(g.appId),
      isFavorite: false,
      source: 'steam' as const,
      playtime: g.playtime,
      lastPlayed: g.lastPlayed ? new Date(g.lastPlayed * 1000).toISOString() : undefined,
    }))

    store.set('games', games)
    console.log('[Main] ✓ Re-synced', games.length, 'games from Steam API')

    // Background mirroring
    mirrorAllCovers()

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
  // Trending Games (Steam Store API)
  // ═══════════════════════════════════════════════════════════

  let trendingCache: { data: unknown; fetchedAt: number } | null = null
  const TRENDING_CACHE_TTL = 10 * 60 * 1000 // 10 minutes

  ipcMain.handle('get-trending-games', async () => {
    console.log('[Main] get-trending-games IPC handler called')

    // Check cache
    if (trendingCache && Date.now() - trendingCache.fetchedAt < TRENDING_CACHE_TTL) {
      console.log('[Main] Returning cached trending data')
      return { success: true, data: trendingCache.data }
    }

    try {
      // Fetch from Steam Store API (bypasses CORS in Electron main process)
      const response = await fetch('https://store.steampowered.com/api/featuredcategories?cc=us&l=en')

      if (!response.ok) {
        throw new Error(`Steam API returned ${response.status}`)
      }

      const rawData = await response.json() as {
        top_sellers?: {
          items?: Array<{
            id: number
            name: string
            header_image?: string
            small_capsule_image?: string
            discount_percent?: number
            original_price?: number
            final_price?: number
            windows_available?: boolean
            linux_available?: boolean
            mac_available?: boolean
          }>
        }
        specials?: { items?: Array<unknown> }
        new_releases?: { items?: Array<unknown> }
      }

      // Extract top sellers (primary trending source)
      const topSellers = rawData.top_sellers?.items || []

      // Hardware IDs to exclude (Steam Deck, controllers, accessories)
      const hardwareIds = new Set([
        1675200,  // Steam Deck
        1675180,  // Steam Deck Dock
        353380,   // Steam Controller
        530260,   // Steam Link
        353370,   // Steam Link
      ])

      // Filter out hardware and non-game items
      const filteredItems = topSellers.filter(item => {
        // Exclude known hardware IDs
        if (hardwareIds.has(item.id)) return false

        // Exclude items with hardware-like names
        const nameLower = item.name.toLowerCase()
        const hardwarePatterns = ['steam deck', 'controller', 'hardware', 'dock', 'steam link', 'valve index']
        if (hardwarePatterns.some(pattern => nameLower.includes(pattern))) return false

        return true
      })

      const games = filteredItems.slice(0, 12).map(item => ({
        id: item.id,
        name: item.name,
        headerImage: item.header_image || `https://steamcdn-a.akamaihd.net/steam/apps/${item.id}/header.jpg`,
        capsuleImage: item.small_capsule_image || `https://steamcdn-a.akamaihd.net/steam/apps/${item.id}/capsule_184x69.jpg`,
        discountPercent: item.discount_percent || 0,
        originalPrice: item.original_price ? `$${(item.original_price / 100).toFixed(2)}` : undefined,
        finalPrice: item.final_price ? (item.final_price === 0 ? 'Free' : `$${(item.final_price / 100).toFixed(2)}`) : undefined,
        windowsAvailable: item.windows_available ?? true,
        linuxAvailable: item.linux_available ?? false,
        macAvailable: item.mac_available ?? false,
      }))

      const trendingData = {
        games,
        fetchedAt: Date.now(),
        source: 'top_sellers' as const,
      }

      // Cache the result
      trendingCache = { data: trendingData, fetchedAt: Date.now() }

      console.log('[Main] ✓ Fetched', games.length, 'trending games from Steam')
      return { success: true, data: trendingData }

    } catch (error) {
      console.error('[Main] Failed to fetch trending games:', error)
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Failed to fetch trending games'
      }
    }
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
              coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${g.appId}/library_600x900_2x.jpg`,
              isInstalled: false,
              isFavorite: false,
              source: 'steam' as const,
              playtime: g.playtime,
              lastPlayed: g.lastPlayed ? new Date(g.lastPlayed * 1000).toISOString() : undefined,
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
          coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${g.appId}/library_600x900_2x.jpg`,
          isInstalled: false,
          isFavorite: false,
          source: 'steam' as const,
          playtime: g.playtime,
          lastPlayed: g.lastPlayed ? new Date(g.lastPlayed * 1000).toISOString() : undefined,
        }))

      store.set('games', [...updatedGames, ...newGames])
      console.log('[Main] ✓ Synced games. Updated:', updatedGames.length, 'New:', newGames.length)

      // Background mirroring
      mirrorAllCovers()
    }

    return apiResult
  })

  // ═══════════════════════════════════════════════════════════
  // Achievements
  // ═══════════════════════════════════════════════════════════

  ipcMain.handle('get-achievements', async (_event, appId: string) => {
    console.log('[Main] get-achievements called for appId:', appId)
    const auth = getAuthState()
    if (!auth.isLoggedIn || !auth.user) {
      return {
        success: false,
        achievements: [],
        totalAchievements: 0,
        unlockedCount: 0,
        error: 'Not logged in. Please login with Steam first.',
        errorCode: 'NO_API_KEY' as const,
      }
    }
    return fetchPlayerAchievements(auth.user.steamId, appId)
  })

  // ═══════════════════════════════════════════════════════════
  // Game News / Patch Notes
  // ═══════════════════════════════════════════════════════════

  const newsCache = new Map<string, { data: unknown; fetchedAt: number }>()
  const NEWS_CACHE_TTL = 5 * 60 * 1000 // 5 minutes

  ipcMain.handle('get-game-news', async (_event, appId: string, count: number = 10) => {
    console.log('[Main] get-game-news called for appId:', appId)

    if (!appId) {
      return {
        success: false,
        news: [],
        totalCount: 0,
        error: 'No Steam App ID provided',
        errorCode: 'NO_STEAM_APP' as const,
      }
    }

    // Check cache
    const cached = newsCache.get(appId)
    if (cached && Date.now() - cached.fetchedAt < NEWS_CACHE_TTL) {
      console.log('[Main] Returning cached news for appId:', appId)
      return cached.data
    }

    try {
      // Steam ISteamNews/GetNewsForApp API (no API key required)
      // Filter to steam_community_announcements to avoid regional third-party news sites
      const url = `https://api.steampowered.com/ISteamNews/GetNewsForApp/v2/?appid=${appId}&count=${count}&maxlength=0&format=json&feeds=steam_community_announcements`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Steam API returned ${response.status}`)
      }

      const data = await response.json() as {
        appnews?: {
          appid: number
          newsitems: Array<{
            gid: string
            title: string
            url: string
            is_external_url: boolean
            author: string
            contents: string
            feedlabel: string
            feedname: string
            date: number
            tags?: string[]
          }>
          count: number
        }
      }

      if (!data.appnews || !data.appnews.newsitems) {
        return {
          success: true,
          news: [],
          totalCount: 0,
        }
      }

      const news = data.appnews.newsitems.map(item => ({
        gid: item.gid,
        title: item.title,
        url: item.url,
        author: item.author || 'Unknown',
        contents: item.contents,
        feedlabel: item.feedlabel,
        feedname: item.feedname,
        date: item.date,
        appId: String(data.appnews!.appid),
      }))

      const result = {
        success: true,
        news,
        totalCount: data.appnews.count,
      }

      // Cache the result
      newsCache.set(appId, { data: result, fetchedAt: Date.now() })
      console.log('[Main] ✓ Fetched', news.length, 'news items for appId:', appId)

      return result

    } catch (error) {
      console.error('[Main] Failed to fetch game news:', error)
      return {
        success: false,
        news: [],
        totalCount: 0,
        error: error instanceof Error ? error.message : 'Failed to fetch game news',
        errorCode: 'NETWORK_ERROR' as const,
      }
    }
  })

  // ═══════════════════════════════════════════════════════════
  // Game Details (Steam Store API)
  // ═══════════════════════════════════════════════════════════

  const detailsCache = new Map<string, { data: unknown; fetchedAt: number }>()
  const DETAILS_CACHE_TTL = 30 * 60 * 1000 // 30 minutes (details don't change often)

  ipcMain.handle('get-game-details', async (_event, appId: string) => {
    console.log('[Main] get-game-details called for appId:', appId)

    if (!appId) {
      return {
        success: false,
        details: null,
        error: 'No Steam App ID provided',
        errorCode: 'NO_STEAM_APP' as const,
      }
    }

    // Check cache
    const cached = detailsCache.get(appId)
    if (cached && Date.now() - cached.fetchedAt < DETAILS_CACHE_TTL) {
      console.log('[Main] Returning cached details for appId:', appId)
      return cached.data
    }

    try {
      // Steam Store appdetails API (no API key required)
      const url = `https://store.steampowered.com/api/appdetails?appids=${appId}&l=en`
      const response = await fetch(url)

      if (!response.ok) {
        throw new Error(`Steam Store API returned ${response.status}`)
      }

      const data = await response.json() as {
        [key: string]: {
          success: boolean
          data?: {
            type: string
            name: string
            steam_appid: number
            short_description: string
            detailed_description: string
            developers?: string[]
            publishers?: string[]
            release_date?: {
              coming_soon: boolean
              date: string
            }
            metacritic?: {
              score: number
              url: string
            }
            pc_requirements?: {
              minimum?: string
              recommended?: string
            }
            genres?: Array<{ id: string; description: string }>
            categories?: Array<{ id: number; description: string }>
          }
        }
      }

      const appData = data[appId]
      if (!appData?.success || !appData.data) {
        return {
          success: false,
          details: null,
          error: 'Game details not found',
          errorCode: 'API_ERROR' as const,
        }
      }

      const d = appData.data
      const details = {
        appId,
        name: d.name,
        shortDescription: d.short_description || '',
        detailedDescription: d.detailed_description || '',
        developers: d.developers || [],
        publishers: d.publishers || [],
        releaseDate: d.release_date?.date || 'Unknown',
        metacriticScore: d.metacritic?.score,
        metacriticUrl: d.metacritic?.url,
        pcRequirements: {
          minimum: d.pc_requirements?.minimum,
          recommended: d.pc_requirements?.recommended,
        },
        genres: d.genres?.map(g => g.description) || [],
        categories: d.categories?.map(c => c.description) || [],
      }

      const result = {
        success: true,
        details,
      }

      // Cache the result
      detailsCache.set(appId, { data: result, fetchedAt: Date.now() })
      console.log('[Main] ✓ Fetched details for:', d.name)

      return result

    } catch (error) {
      console.error('[Main] Failed to fetch game details:', error)
      return {
        success: false,
        details: null,
        error: error instanceof Error ? error.message : 'Failed to fetch game details',
        errorCode: 'NETWORK_ERROR' as const,
      }
    }
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

  // Initial mirroring
  setTimeout(() => mirrorAllCovers(), 5000) // Delay to let app settle
})
