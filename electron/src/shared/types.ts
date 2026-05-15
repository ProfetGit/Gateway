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
    sizeOnDisk?: number
    notes?: string
    launchArgs?: string
    heroImageUrl?: string
    logoImageUrl?: string
    customEnvVars?: string
    appType?: string
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

