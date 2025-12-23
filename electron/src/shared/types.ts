export interface Game {
    id: string
    title: string
    coverUrl?: string
    localCoverPath?: string
    executablePath?: string
    steamAppId?: string
    lutrisId?: number
    lutrisSlug?: string
    isInstalled: boolean
    isFavorite: boolean
    source: 'manual' | 'steam' | 'lutris'
    playtime?: number
    lastPlayed?: string
    notes?: string
    launchArgs?: string
    heroImageUrl?: string
    logoImageUrl?: string
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
