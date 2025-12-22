export interface Game {
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
    sizeOnDisk?: number // Bytes
    notes?: string
    launchArgs?: string
}

export type FilterStatus = 'all' | 'installed'
export type FilterPlatform = 'all' | 'steam'

export type SortOption = 'alphabetical' | 'playtime' | 'lastPlayed'
export type SortOrder = 'asc' | 'desc'

export interface FilterState {
    status: FilterStatus
    platform: FilterPlatform
    onlyFavorites: boolean
    search: string
    sortBy: SortOption
    sortOrder: SortOrder
}

export interface PreloadState {
    cursor: number
    isActive: boolean
}

export type ViewType = 'home' | 'library'

export interface GameStore {
    games: Game[]
    selectedGame: Game | null

    // Preloading
    preloadState: PreloadState
    startPreloading: () => void
    stopPreloading: () => void

    // UI State
    currentView: ViewType
    filters: FilterState

    // Modal/Panel State
    isDetailOpen: boolean
    isSettingsOpen: boolean
    isAddModalOpen: boolean

    // Actions
    setView: (view: ViewType) => void
    setGames: (games: Game[]) => void
    addGame: (game: Game) => void
    updateGame: (id: string, updates: Partial<Game>) => void
    deleteGame: (id: string) => void
    selectGame: (game: Game | null) => void

    // Filter Actions
    setFilterStatus: (status: FilterStatus) => void
    setFilterPlatform: (platform: FilterPlatform) => void
    toggleOnlyFavorites: () => void
    setSearchQuery: (query: string) => void
    setSort: (sortBy: SortOption, sortOrder: SortOrder) => void
    resetFilters: () => void

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

// Achievement types
export interface Achievement {
    apiname: string
    name: string
    description: string
    achieved: boolean
    unlocktime: number
    icon: string
    icongray: string
}

export interface FetchAchievementsResult {
    success: boolean
    achievements: Achievement[]
    totalAchievements: number
    unlockedCount: number
    gameName?: string
    error?: string
    errorCode?: 'NO_API_KEY' | 'PROFILE_PRIVATE' | 'NO_ACHIEVEMENTS' | 'API_ERROR' | 'NETWORK_ERROR'
}

// Game News / Patch Notes types
export interface NewsItem {
    gid: string
    title: string
    url: string
    author: string
    contents: string
    feedlabel: string
    feedname: string
    date: number
    appId: string
}

export interface FetchNewsResult {
    success: boolean
    news: NewsItem[]
    totalCount: number
    error?: string
    errorCode?: 'NO_STEAM_APP' | 'API_ERROR' | 'NETWORK_ERROR'
}

// Steam Store Game Details types
export interface GameDetails {
    appId: string
    name: string
    shortDescription: string
    detailedDescription: string
    developers: string[]
    publishers: string[]
    releaseDate: string
    metacriticScore?: number
    metacriticUrl?: string
    pcRequirements: {
        minimum?: string
        recommended?: string
    }
    genres: string[]
    categories: string[]
}

export interface FetchGameDetailsResult {
    success: boolean
    details: GameDetails | null
    error?: string
    errorCode?: 'NO_STEAM_APP' | 'API_ERROR' | 'NETWORK_ERROR'
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

    // Achievements
    getAchievements: (appId: string) => Promise<FetchAchievementsResult>

    // Game News / Patch Notes
    getGameNews: (appId: string, count?: number) => Promise<FetchNewsResult>

    // Game Details (Steam Store)
    getGameDetails: (appId: string) => Promise<FetchGameDetailsResult>

    // Trending games
    getTrendingGames: () => Promise<import('./trending').FetchTrendingResult>

    // File dialogs
    selectExecutable: () => Promise<string | null>
    selectImage: () => Promise<string | null>

    // Window controls
    minimizeWindow: () => void
    maximizeWindow: () => void
    closeWindow: () => void

    // Events
    onGamesUpdated: (callback: (games: Game[]) => void) => () => void
}

declare global {
    interface Window {
        api: ElectronAPI
    }
}

