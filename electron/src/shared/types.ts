// Gamescope configuration options
export interface GamescopeSettings {
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

export interface Game {
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
    sizeOnDisk?: number
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

// Heroic game data structure
export interface HeroicGame {
    appName: string
    title: string
    installPath?: string
    executable?: string
    platform: string
    installSize: number
    runner: 'legendary' | 'gog' | 'sideload'
    isInstalled: boolean
    coverUrl?: string
    heroUrl?: string
}

export interface HeroicStatus {
    installed: boolean
    version: string | null
    dataPath: string | null
    gamesCount: number
    epicCount: number
    gogCount: number
    sideloadCount: number
}

export interface SteamAuthData {
    isLoggedIn: boolean
    user: {
        steamId: string
        username: string
        avatarUrl: string
        profileUrl: string
    } | null
}

export interface StoreData {
    games: Game[]
    settings: {
        steamPath: string
        steamApiKey?: string
        hasCompletedSetup?: boolean
    }
    steamAuth?: SteamAuthData
    claimedAppIds?: string[]
    pendingClaimAppId?: string | null
}

// Lutris database row
export interface LutrisGame {
    id: number
    name: string
    slug: string
    runner: string
    installed: number
    directory: string | null
    playtime: number | null
    lastplayed: number | null
    configpath: string | null
    service: string | null
    service_id: string | null
}

export interface LutrisStatus {
    installed: boolean
    version: string | null
    dataPath: string | null
    gamesCount: number
}
