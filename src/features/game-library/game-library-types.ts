export interface Game {
    id: string
    title: string
    coverUrl?: string
    localCoverPath?: string
    executablePath?: string
    steamAppId?: string
    // Steam appid used for READ-ONLY data (store details, news, achievement
    // definitions). NOT ownership — never route launch/install through it.
    metadataAppId?: string
    // Achievement apiname -> unix seconds. Only used when Steam can't report
    // unlock state (i.e. the user doesn't own the game there).
    manualUnlocks?: Record<string, number>
    winePrefix?: string
    shortcutId?: string
    // Heroic / Lutris identity. Both are launch targets, not metadata — see
    // resolve-launch.ts, where they take precedence over steamAppId.
    heroicAppName?: string
    heroicRunner?: 'legendary' | 'gog' | 'sideload'
    lutrisId?: number
    lutrisSlug?: string
    isInstalled: boolean
    isFavorite: boolean
    source: 'manual' | 'steam' | 'shortcut' | 'heroic' | 'lutris'
    playtime?: number
    lastPlayed?: string
    sizeOnDisk?: number // Bytes
    notes?: string
    launchArgs?: string
    heroImageUrl?: string
    logoImageUrl?: string
    customEnvVars?: string     // Custom environment variables (VAR=value VAR2=value2)
    // How to actually run `executablePath`. Provenance lives in `source`; this
    // is the runtime. undefined behaves as 'auto' — see resolve-launch.ts.
    runner?: LaunchRunner
    protonPath?: string        // Proton build dir, or a umu alias ('GE-Proton')
    umuGameId?: string         // umu GAMEID — 'umu-<appid>' turns on protonfixes
    useMangoHud?: boolean
    useGameMode?: boolean
    appType?: AppType          // Resolved by background classifier
}

// Mirrors the `type` field Steam's appdetails API returns. The list is wider
// than just game/dlc — an incomplete enum here is not cosmetic, since a value
// we don't recognise used to fail the whole library parse.
export const APP_TYPES = [
    'game',
    'dlc',
    'demo',
    'mod',
    'application',
    'music',
    'video',
    'series',
    'episode',
    'advertising',
    'hardware',
] as const

export type AppType = (typeof APP_TYPES)[number]

// Runtime used to start `executablePath`. 'auto' infers from the file
// extension at launch time; the rest force a specific path.
export const LAUNCH_RUNNERS = ['auto', 'umu', 'wine', 'native'] as const
export type LaunchRunner = (typeof LAUNCH_RUNNERS)[number]

export type FilterStatus = 'all' | 'installed'
// Derived, so it can never drift from the source union again.
export type FilterPlatform = 'all' | Game['source']

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

export type ViewType = 'home' | 'library'

export interface GameStore {
    games: Game[]
    selectedGame: Game | null

    // UI State
    currentView: ViewType
    filters: FilterState

    // Modal/Panel State
    isDetailOpen: boolean
    isSettingsOpen: boolean
    isAddModalOpen: boolean
    isHuntsDrawerOpen: boolean
    isAchievementsOpen: boolean
    // Properties layers ABOVE GameDetail rather than replacing it — it is
    // usually opened from there, and closing it should return you to the game.
    isPropertiesOpen: boolean
    propertiesGame: Game | null
    isInstallWizardOpen: boolean

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
    openAchievements: () => void
    closeAchievements: () => void
    openProperties: (game: Game) => void
    closeProperties: () => void
    openInstallWizard: () => void
    closeInstallWizard: () => void
}

// Steam status type
export interface SteamStatus {
    installed: boolean
    steamPath: string | null
    libraryPaths: string[]
    userId: string | null
    username: string | null
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
