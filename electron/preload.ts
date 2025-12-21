import { ipcRenderer, contextBridge } from 'electron'

// Type definitions
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

// Expose secure API to renderer
contextBridge.exposeInMainWorld('api', {
  // Game operations
  getGames: (): Promise<Game[]> => ipcRenderer.invoke('get-games'),
  addGame: (game: Omit<Game, 'id'>): Promise<Game> => ipcRenderer.invoke('add-game', game),
  updateGame: (id: string, updates: Partial<Game>): Promise<Game> => ipcRenderer.invoke('update-game', id, updates),
  deleteGame: (id: string): Promise<void> => ipcRenderer.invoke('delete-game', id),
  launchGame: (game: Game): Promise<void> => ipcRenderer.invoke('launch-game', game),

  // Steam integration (local files)
  syncSteam: (): Promise<Game[]> => ipcRenderer.invoke('sync-steam'),
  getSteamStatus: (): Promise<SteamStatus> => ipcRenderer.invoke('get-steam-status'),
  installSteamGame: (appId: string): Promise<void> => ipcRenderer.invoke('install-steam-game', appId),
  clearAndResync: (): Promise<{ success: boolean; error?: string; totalGames?: number; installedGames?: number }> =>
    ipcRenderer.invoke('clear-and-resync'),

  // Steam authentication
  steamLogin: (): Promise<AuthState> => ipcRenderer.invoke('steam-login'),
  steamLogout: (): Promise<AuthState> => ipcRenderer.invoke('steam-logout'),
  getAuthState: (): Promise<AuthState> => ipcRenderer.invoke('get-auth-state'),
  hasSteamApiKey: (): Promise<boolean> => ipcRenderer.invoke('has-steam-api-key'),
  fetchSteamGames: (): Promise<FetchGamesResult> => ipcRenderer.invoke('fetch-steam-games'),


  // Trending games (Steam Store API)
  getTrendingGames: () => ipcRenderer.invoke('get-trending-games'),

  // File dialogs
  selectExecutable: (): Promise<string | null> => ipcRenderer.invoke('select-executable'),
  selectImage: (): Promise<string | null> => ipcRenderer.invoke('select-image'),

  // Window controls
  minimizeWindow: () => ipcRenderer.send('minimize-window'),
  maximizeWindow: () => ipcRenderer.send('maximize-window'),
  closeWindow: () => ipcRenderer.send('close-window'),

  // Events
  onGamesUpdated: (callback: (games: Game[]) => void) => {
    const subscription = (_event: any, games: Game[]) => callback(games)
    ipcRenderer.on('games-updated', subscription)
    return () => ipcRenderer.removeListener('games-updated', subscription)
  }
})

