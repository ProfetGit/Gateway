// Runtime used to start `executablePath`. 'auto' infers from the file
// extension at launch time; the rest force a specific path.
export type LaunchRunner = 'auto' | 'umu' | 'wine' | 'native'

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
    // How to actually run `executablePath`. Provenance lives in `source`; this
    // is the runtime. undefined behaves as 'auto' — see resolve-launch.ts.
    runner?: LaunchRunner
    // Absolute path to a Proton build, or a umu alias like 'GE-Proton'. Unset
    // lets umu pick (and download) UMU-Proton itself.
    protonPath?: string
    // umu's GAMEID. 'umu-<steam appid>' is what enables protonfixes for a
    // known title; '0' is the generic fallback.
    umuGameId?: string
    useMangoHud?: boolean
    useGameMode?: boolean
    // Mirrors Steam's appdetails `type`; see shared/normalize-app-type.ts.
    appType?:
        | 'game'
        | 'dlc'
        | 'demo'
        | 'mod'
        | 'application'
        | 'music'
        | 'video'
        | 'series'
        | 'episode'
        | 'advertising'
        | 'hardware'
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
        // Defaults seeded onto NEW games at creation time. Never consulted at
        // launch — what the Properties panel shows is what runs.
        prefixRoot?: string
        defaultProtonPath?: string
        defaultUseMangoHud?: boolean
        defaultUseGameMode?: boolean
    }
    steamAuth?: SteamAuthData
    claimedAppIds?: string[]
    pendingClaimAppId?: string | null
}
