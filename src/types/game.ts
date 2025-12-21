export interface Game {
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

export type GameFilter = 'all' | 'installed' | 'favorites' | 'steam' | 'not-installed'

export type ViewType = 'home' | 'library'

export interface GameStore {
    games: Game[]
    selectedGame: Game | null
    filter: GameFilter
    searchQuery: string
    isDetailOpen: boolean
    isSettingsOpen: boolean
    isAddModalOpen: boolean
    currentView: ViewType

    // Actions
    setView: (view: ViewType) => void
    setGames: (games: Game[]) => void
    addGame: (game: Game) => void
    updateGame: (id: string, updates: Partial<Game>) => void
    deleteGame: (id: string) => void
    selectGame: (game: Game | null) => void
    setFilter: (filter: GameFilter) => void
    setSearchQuery: (query: string) => void
    toggleFavorite: (id: string) => void
    openDetail: (game: Game) => void
    closeDetail: () => void
    openSettings: () => void
    closeSettings: () => void
    openAddModal: () => void
    closeAddModal: () => void
}

// Steam status type
export interface SteamStatus {
    installed: boolean
    steamPath: string | null
    libraryPaths: string[]
    userId: string | null
    username: string | null
}

// Steam auth types
export interface SteamUser {
    steamId: string
    username: string
    avatarUrl: string
    profileUrl: string
}

export interface AuthState {
    isLoggedIn: boolean
    user: SteamUser | null
}

export interface SteamOwnedGame {
    appId: string
    name: string
    playtime: number
}

export interface FetchGamesResult {
    success: boolean
    games: SteamOwnedGame[]
    error?: string
    errorCode?: 'NO_API_KEY' | 'PROFILE_PRIVATE' | 'API_ERROR' | 'NETWORK_ERROR' | 'RATE_LIMITED'
}

// Electron IPC API types
export interface ElectronAPI {
    // Game operations
    getGames: () => Promise<Game[]>
    addGame: (game: Omit<Game, 'id'>) => Promise<Game>
    updateGame: (id: string, updates: Partial<Game>) => Promise<Game>
    deleteGame: (id: string) => Promise<void>
    launchGame: (game: Game) => Promise<void>

    // Steam integration (local files)
    syncSteam: () => Promise<Game[]>
    getSteamStatus: () => Promise<SteamStatus>
    installSteamGame: (appId: string) => Promise<void>
    clearAndResync: () => Promise<{ success: boolean; error?: string; totalGames?: number; installedGames?: number }>

    // Steam authentication
    steamLogin: () => Promise<AuthState>
    steamLogout: () => Promise<AuthState>
    getAuthState: () => Promise<AuthState>
    hasSteamApiKey: () => Promise<boolean>
    fetchSteamGames: () => Promise<FetchGamesResult>

    // File dialogs
    selectExecutable: () => Promise<string | null>
    selectImage: () => Promise<string | null>

    // Window controls
    minimizeWindow: () => void
    maximizeWindow: () => void
    closeWindow: () => void
}

declare global {
    interface Window {
        api: ElectronAPI
    }
}

