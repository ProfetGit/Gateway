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
    sizeOnDisk?: number
    notes?: string
    launchArgs?: string
    heroImageUrl?: string
    logoImageUrl?: string
    customEnvVars?: string
    appType?: 'game' | 'dlc' | 'application' | 'music' | 'demo' | 'mod'
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
