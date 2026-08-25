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
    heroImageUrl?: string
    logoImageUrl?: string
    customEnvVars?: string     // Custom environment variables (VAR=value VAR2=value2)
    appType?: 'game' | 'dlc' | 'application' | 'music' | 'demo' | 'mod' // Resolved by background classifier
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
    resetPreload: () => void

    // UI State
    currentView: ViewType
    filters: FilterState

    // Modal/Panel State
    isDetailOpen: boolean
    isSettingsOpen: boolean
    isAddModalOpen: boolean
    isHuntsDrawerOpen: boolean

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
    openHuntsDrawer: () => void
    closeHuntsDrawer: () => void
}

// Steam status type
export interface SteamStatus {
    installed: boolean
    steamPath: string | null
    libraryPaths: string[]
    userId: string | null
    username: string | null
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
