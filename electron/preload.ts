import { ipcRenderer, contextBridge } from 'electron'

// Gamescope configuration options
interface GamescopeSettings {
  enabled: boolean
  width?: number
  height?: number
  outputWidth?: number
  outputHeight?: number
  fullscreen?: boolean
  borderless?: boolean
  scaler?: 'auto' | 'integer' | 'fit' | 'fill' | 'stretch'
  filter?: 'linear' | 'nearest' | 'fsr' | 'nis'
  fsr?: boolean
  fsrSharpness?: number
  nisSharpness?: number
  fpsLimit?: number
  unfocusedFpsLimit?: number
  exposeWayland?: boolean
  hdr?: boolean
  forceGrabCursor?: boolean
  adaptiveSync?: boolean
  vrr?: boolean
}

// Type definitions
interface Game {
  id: string
  title: string
  coverUrl?: string
  localCoverPath?: string
  executablePath?: string
  steamAppId?: string
  lutrisId?: number
  lutrisSlug?: string
  heroicAppName?: string
  heroicRunner?: 'legendary' | 'gog' | 'sideload'
  isInstalled: boolean
  isFavorite: boolean
  source: 'manual' | 'steam' | 'lutris' | 'heroic'
  playtime?: number
  lastPlayed?: string
  notes?: string
  launchArgs?: string
  heroImageUrl?: string
  logoImageUrl?: string
  // Launch options
  mangoHudEnabled?: boolean
  gamescope?: GamescopeSettings
  gamemodeEnabled?: boolean
  customEnvVars?: string
}

interface SteamStatus {
  installed: boolean
  steamPath: string | null
  libraryPaths: string[]
  userId: string | null
  username: string | null
}

interface SteamUser {
  steamId: string
  username: string
  avatarUrl: string
  profileUrl: string
}

interface AuthState {
  isLoggedIn: boolean
  user: SteamUser | null
}

interface SteamOwnedGame {
  appId: string
  name: string
  playtime: number
}

interface FetchGamesResult {
  success: boolean
  games: SteamOwnedGame[]
  error?: string
}

interface Achievement {
  apiname: string
  name: string
  description: string
  achieved: boolean
  unlocktime: number
  icon: string
  icongray: string
}

interface FetchAchievementsResult {
  success: boolean
  achievements: Achievement[]
  totalAchievements: number
  unlockedCount: number
  gameName?: string
  error?: string
  errorCode?: 'NO_API_KEY' | 'PROFILE_PRIVATE' | 'NO_ACHIEVEMENTS' | 'API_ERROR' | 'NETWORK_ERROR'
}

// Expose secure API to renderer
contextBridge.exposeInMainWorld('api', {
  // Game operations
  getGames: (): Promise<Game[]> => ipcRenderer.invoke('get-games'),
  addGame: (game: Omit<Game, 'id'>): Promise<Game> => ipcRenderer.invoke('add-game', game),
  updateGame: (id: string, updates: Partial<Game>): Promise<Game> => ipcRenderer.invoke('update-game', id, updates),
  deleteGame: (id: string): Promise<void> => ipcRenderer.invoke('delete-game', id),
  launchGame: (game: Game): Promise<void> => ipcRenderer.invoke('launch-game', game),
  uninstallGame: (game: Game): Promise<{ success: boolean; error?: string }> => ipcRenderer.invoke('uninstall-game', game),

  // Steam integration (local files)
  syncSteam: (): Promise<Game[]> => ipcRenderer.invoke('sync-steam'),
  getSteamStatus: (): Promise<SteamStatus> => ipcRenderer.invoke('get-steam-status'),
  installSteamGame: (appId: string): Promise<void> => ipcRenderer.invoke('install-steam-game', appId),
  clearAndResync: (): Promise<{ success: boolean; error?: string; totalGames?: number; installedGames?: number }> =>
    ipcRenderer.invoke('clear-and-resync'),

  // Lutris integration
  getLutrisStatus: () => ipcRenderer.invoke('get-lutris-status'),
  syncLutris: (): Promise<Game[]> => ipcRenderer.invoke('sync-lutris'),

  // Heroic integration
  getHeroicStatus: () => ipcRenderer.invoke('get-heroic-status'),
  syncHeroic: (): Promise<Game[]> => ipcRenderer.invoke('sync-heroic'),
  installHeroicGame: (appName: string, runner?: string): Promise<{ success: boolean; error?: string }> =>
    ipcRenderer.invoke('install-heroic-game', appName, runner),

  // Steam authentication
  steamLogin: (): Promise<AuthState> => ipcRenderer.invoke('steam-login'),
  steamLogout: (): Promise<AuthState> => ipcRenderer.invoke('steam-logout'),
  getAuthState: (): Promise<AuthState> => ipcRenderer.invoke('get-auth-state'),
  hasSteamApiKey: (): Promise<boolean> => ipcRenderer.invoke('has-steam-api-key'),
  fetchSteamGames: (): Promise<FetchGamesResult> => ipcRenderer.invoke('fetch-steam-games'),

  // Achievements
  getAchievements: (appId: string): Promise<FetchAchievementsResult> => ipcRenderer.invoke('get-achievements', appId),

  // Game News / Patch Notes
  getGameNews: (appId: string, count: number = 10) => ipcRenderer.invoke('get-game-news', appId, count),

  // Game Details (Steam Store)
  getGameDetails: (appId: string) => ipcRenderer.invoke('get-game-details', appId),


  // Trending games (Steam Store API)
  getTrendingGames: () => ipcRenderer.invoke('get-trending-games'),

  // Free deals (GamerPower API - temporarily free Steam games)
  getFreeDeals: () => ipcRenderer.invoke('get-free-deals'),

  // Open Steam store page in Steam app
  openSteamStore: (appId: string | number) => ipcRenderer.invoke('open-steam-store', String(appId)),

  // Open Steam store and track as pending claim (for free games)
  openSteamStoreClaim: (appId: string | number) => ipcRenderer.invoke('open-steam-store-claim', String(appId)),

  // Check if user owns a specific game
  checkGameOwned: (appId: string) => ipcRenderer.invoke('check-game-owned', appId),

  // Open URL in default browser
  openUrl: (url: string) => ipcRenderer.invoke('open-url', url),

  // File dialogs
  selectExecutable: (): Promise<string | null> => ipcRenderer.invoke('select-executable'),
  selectImage: (): Promise<string | null> => ipcRenderer.invoke('select-image'),

  // Setup wizard / app config
  getSetupState: (): Promise<{
    hasCompletedSetup: boolean
    hasApiKey: boolean
    isSteamLoggedIn: boolean
    hasGames: boolean
  }> => ipcRenderer.invoke('get-setup-state'),
  markSetupComplete: (): Promise<void> => ipcRenderer.invoke('mark-setup-complete'),
  setSteamApiKey: (key: string): Promise<{ success: boolean; hasKey: boolean }> =>
    ipcRenderer.invoke('set-steam-api-key', key),
  getSteamApiKey: (): Promise<string> => ipcRenderer.invoke('get-steam-api-key'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // Events
  onGamesUpdated: (callback: (games: Game[]) => void) => {
    const subscription = (_event: any, games: Game[]) => callback(games)
    ipcRenderer.on('games-updated', subscription)
    return () => ipcRenderer.removeListener('games-updated', subscription)
  },

  // Game claimed event (fired when window regains focus after claiming)
  onGameClaimed: (callback: (data: { appId: string; owned: boolean }) => void) => {
    const subscription = (_event: any, data: { appId: string; owned: boolean }) => callback(data)
    ipcRenderer.on('game-claimed', subscription)
    return () => ipcRenderer.removeListener('game-claimed', subscription)
  }
})

