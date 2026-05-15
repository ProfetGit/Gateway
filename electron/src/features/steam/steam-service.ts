import fs from 'node:fs'
import path from 'node:path'
import { execSync } from 'node:child_process'
import { v4 as uuidv4 } from 'uuid'

// ═══════════════════════════════════════════════════════════
// Types
// ═══════════════════════════════════════════════════════════

export interface SteamGame {
    appId: string
    name: string
    isInstalled: boolean
    sizeOnDisk?: number
    lastPlayed?: number // Unix timestamp
    installPath?: string
    playtime?: number
}

export interface SteamStatus {
    installed: boolean
    steamPath: string | null
    libraryPaths: string[]
    userId: string | null
    username: string | null
}

export interface Game {
    id: string
    title: string
    coverUrl?: string
    executablePath?: string
    steamAppId?: string
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
}

interface StoreInterface {
    get(key: 'games'): Game[]
    set(key: 'games', value: Game[]): void
}

// ═══════════════════════════════════════════════════════════
// VDF Parser - Valve Data Format
// ═══════════════════════════════════════════════════════════

type VdfValue = string | VdfObject
interface VdfObject {
    [key: string]: VdfValue
}

/**
 * Parses Valve Data Format (VDF) files used by Steam
 * Handles nested structures, quoted strings, and escape sequences
 */
export function parseVdf(content: string): VdfObject {
    const result: VdfObject = {}
    const stack: VdfObject[] = [result]
    let currentKey: string | null = null

    // Tokenize - match quoted strings or braces
    const tokenRegex = /"([^"\\]*(?:\\.[^"\\]*)*)"|(\{)|(\})/g
    let match: RegExpExecArray | null

    while ((match = tokenRegex.exec(content)) !== null) {
        const [, quotedString, openBrace, closeBrace] = match

        if (quotedString !== undefined) {
            // Unescape the string
            const unescaped = quotedString
                .replace(/\\n/g, '\n')
                .replace(/\\t/g, '\t')
                .replace(/\\"/g, '"')
                .replace(/\\\\/g, '\\')

            if (currentKey === null) {
                currentKey = unescaped
            } else {
                const current = stack[stack.length - 1]
                current[currentKey] = unescaped
                currentKey = null
            }
        } else if (openBrace) {
            if (currentKey !== null) {
                const newObj: VdfObject = {}
                const current = stack[stack.length - 1]
                current[currentKey] = newObj
                stack.push(newObj)
                currentKey = null
            }
        } else if (closeBrace) {
            if (stack.length > 1) {
                stack.pop()
            }
        }
    }

    return result
}

/**
 * Escapes a string for VDF format
 */
function escapeVdfString(str: string): string {
    return str
        .replace(/\\/g, '\\\\')
        .replace(/"/g, '\\"')
        .replace(/\n/g, '\\n')
        .replace(/\t/g, '\\t')
}

/**
 * Serializes a VDF object back to string format
 * Inverse of parseVdf - produces valid VDF that Steam can read
 */
export function serializeVdf(obj: VdfObject, indent: number = 0): string {
    const tabs = '\t'.repeat(indent)
    const lines: string[] = []

    for (const [key, value] of Object.entries(obj)) {
        if (typeof value === 'string') {
            // Key-value pair
            lines.push(`${tabs}"${escapeVdfString(key)}"\t\t"${escapeVdfString(value)}"`)
        } else {
            // Nested object
            lines.push(`${tabs}"${escapeVdfString(key)}"`)
            lines.push(`${tabs}{`)
            lines.push(serializeVdf(value, indent + 1))
            lines.push(`${tabs}}`)
        }
    }

    return lines.join('\n')
}

// ═══════════════════════════════════════════════════════════
// Steam Path Detection (cross-platform)
// ═══════════════════════════════════════════════════════════

function getCandidateSteamPaths(): string[] {
    const home = process.env.HOME || process.env.USERPROFILE || ''

    if (process.platform === 'win32') {
        const paths: string[] = []

        // 1. Registry — authoritative on Windows. Read HKCU\Software\Valve\Steam\SteamPath
        try {
            const out = execSync('reg query "HKCU\\Software\\Valve\\Steam" /v SteamPath', { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] })
            const match = out.match(/SteamPath\s+REG_SZ\s+(.+?)\s*$/m)
            if (match && match[1]) {
                paths.push(match[1].replace(/\//g, '\\').trim())
            }
        } catch {
            // Registry key missing — fall through to common paths
        }

        // 2. Common install locations
        const programFilesX86 = process.env['ProgramFiles(x86)'] || 'C:\\Program Files (x86)'
        const programFiles = process.env.ProgramFiles || 'C:\\Program Files'
        paths.push(path.join(programFilesX86, 'Steam'))
        paths.push(path.join(programFiles, 'Steam'))

        return paths
    }

    if (process.platform === 'darwin') {
        return [
            path.join(home, 'Library/Application Support/Steam'),
        ]
    }

    // Linux + others
    return [
        path.join(home, '.steam/steam'),
        path.join(home, '.steam/debian-installation'),
        path.join(home, '.local/share/Steam'),
        // Flatpak
        path.join(home, '.var/app/com.valvesoftware.Steam/.steam/steam'),
        path.join(home, '.var/app/com.valvesoftware.Steam/.local/share/Steam'),
        // Snap
        path.join(home, 'snap/steam/common/.steam/steam'),
        // System-wide
        '/usr/share/steam',
        '/usr/local/share/steam',
    ]
}

/**
 * Find the Steam installation directory by probing platform-appropriate paths.
 * On Windows, prefers the SteamPath registry value over hardcoded locations.
 */
export function findSteamInstallation(): string | null {
    const candidates = getCandidateSteamPaths()
    for (const steamPath of candidates) {
        try {
            const resolved = fs.existsSync(steamPath)
                ? fs.realpathSync(steamPath)
                : null

            if (resolved && fs.existsSync(path.join(resolved, 'steamapps'))) {
                console.log('[SteamService] Found Steam at:', resolved)
                return resolved
            }
        } catch {
            continue
        }
    }
    console.warn('[SteamService] No Steam installation found. Candidates checked:', candidates)
    return null
}

/**
 * Get all Steam library folder paths
 */
export function getLibraryFolders(steamPath: string): string[] {
    const libraryFoldersPath = path.join(steamPath, 'steamapps/libraryfolders.vdf')

    if (!fs.existsSync(libraryFoldersPath)) {
        return [steamPath]
    }

    try {
        const content = fs.readFileSync(libraryFoldersPath, 'utf-8')
        const parsed = parseVdf(content)
        const libraryfolders = parsed['libraryfolders'] as VdfObject | undefined

        if (!libraryfolders) {
            return [steamPath]
        }

        const paths: string[] = []

        for (const key of Object.keys(libraryfolders)) {
            const entry = libraryfolders[key]
            if (typeof entry === 'object' && entry['path']) {
                paths.push(entry['path'] as string)
            }
        }

        return paths.length > 0 ? paths : [steamPath]
    } catch (error) {
        console.error('Failed to parse libraryfolders.vdf:', error)
        return [steamPath]
    }
}

// ═══════════════════════════════════════════════════════════
// Steam User Detection
// ═══════════════════════════════════════════════════════════

interface SteamUser {
    userId: string
    username: string
    mostRecent: boolean
}

/**
 * Get the most recently logged in Steam user
 */
export function getMostRecentUser(steamPath: string): SteamUser | null {
    const loginUsersPath = path.join(steamPath, 'config/loginusers.vdf')

    if (!fs.existsSync(loginUsersPath)) {
        return null
    }

    try {
        const content = fs.readFileSync(loginUsersPath, 'utf-8')
        const parsed = parseVdf(content)
        const users = parsed['users'] as VdfObject | undefined

        if (!users) {
            return null
        }

        // Find most recent user
        for (const [userId, userData] of Object.entries(users)) {
            if (typeof userData === 'object') {
                const mostRecent = userData['MostRecent'] || userData['mostrecent']
                if (mostRecent === '1') {
                    return {
                        userId,
                        username: (userData['PersonaName'] || userData['AccountName'] || 'Unknown') as string,
                        mostRecent: true,
                    }
                }
            }
        }

        // If no most recent, return first user
        const firstUserId = Object.keys(users)[0]
        if (firstUserId) {
            const userData = users[firstUserId] as VdfObject
            return {
                userId: firstUserId,
                username: (userData['PersonaName'] || userData['AccountName'] || 'Unknown') as string,
                mostRecent: false,
            }
        }

        return null
    } catch (error) {
        console.error('Failed to parse loginusers.vdf:', error)
        return null
    }
}

// ═══════════════════════════════════════════════════════════
// Installed Games Detection
// ═══════════════════════════════════════════════════════════

/**
 * Get all installed Steam games from appmanifest files
 */
export function getInstalledGames(libraryPaths: string[]): SteamGame[] {
    console.log('[SteamService] getInstalledGames called with paths:', libraryPaths)
    const games: SteamGame[] = []
    const seenAppIds = new Set<string>()

    for (const libPath of libraryPaths) {
        const appsPath = path.join(libPath, 'steamapps')
        console.log('[SteamService] Checking steamapps at:', appsPath)

        if (!fs.existsSync(appsPath)) {
            console.log('[SteamService] \u274c Path does not exist:', appsPath)
            continue
        }

        try {
            const files = fs.readdirSync(appsPath)
            const manifestFiles = files.filter(f => f.startsWith('appmanifest_') && f.endsWith('.acf'))
            console.log('[SteamService] Found', manifestFiles.length, 'appmanifest files in', appsPath)

            for (const file of files) {
                if (!file.startsWith('appmanifest_') || !file.endsWith('.acf')) {
                    continue
                }

                const manifestPath = path.join(appsPath, file)

                try {
                    const content = fs.readFileSync(manifestPath, 'utf-8')
                    const parsed = parseVdf(content)
                    const appState = parsed['AppState'] as VdfObject | undefined

                    if (!appState) {
                        console.log('[SteamService] No AppState in manifest:', file)
                        continue
                    }

                    const appId = appState['appid'] as string
                    const name = appState['name'] as string

                    if (!appId || !name || seenAppIds.has(appId)) {
                        continue
                    }

                    seenAppIds.add(appId)

                    // Skip tools, proton, etc
                    if (isToolOrRuntime(name, appId)) {
                        console.log('[SteamService] Skipping tool/runtime:', name)
                        continue
                    }

                    const sizeOnDisk = parseInt(appState['SizeOnDisk'] as string || '0', 10)
                    const installDir = appState['installdir'] as string

                    games.push({
                        appId,
                        name,
                        isInstalled: true,
                        sizeOnDisk: sizeOnDisk > 0 ? sizeOnDisk : undefined,
                        installPath: installDir ? path.join(appsPath, 'common', installDir) : undefined,
                    })
                } catch (error) {
                    console.warn(`[SteamService] Failed to parse manifest ${file}:`, error)
                }
            }
        } catch (error) {
            console.warn(`[SteamService] Failed to read steamapps in ${libPath}:`, error)
        }
    }

    console.log('[SteamService] getInstalledGames returning', games.length, 'games')
    return games
}

/**
 * Check if an app is a tool/runtime rather than a game
 */
function isToolOrRuntime(name: string, appId: string): boolean {
    const toolPatterns = [
        /proton/i,
        /steam linux runtime/i,
        /steamworks/i,
        /redistributable/i,
        /^steam$/i,
        /dedicated server/i,
        /sdk$/i,
    ]

    // Known tool app IDs
    const toolAppIds = new Set([
        '228980',  // Steamworks Common Redistributables
        '1070560', // Steam Linux Runtime
        '1493710', // Proton Experimental
        '1887720', // Proton EasyAntiCheat Runtime
        '2180100', // Proton BattlEye Runtime
    ])

    if (toolAppIds.has(appId)) {
        return true
    }

    return toolPatterns.some(pattern => pattern.test(name))
}

// ═══════════════════════════════════════════════════════════
// Owned Games Detection (from localconfig.vdf)
// ═══════════════════════════════════════════════════════════

interface OwnedGameInfo {
    appId: string
    lastPlayed?: number
    playtime?: number
}

const STEAM_ID_OFFSET = BigInt('76561197960265728')

function steamID64to32(steamId64: string): string {
    try {
        const id = BigInt(steamId64)
        return (id - STEAM_ID_OFFSET).toString()
    } catch {
        return ''
    }
}

/**
 * Get owned games from user's local config
 * This includes games that may not be installed
 */
export function getOwnedGames(steamPath: string, userId: string): OwnedGameInfo[] {
    const userdataPath = path.join(steamPath, 'userdata')
    console.log('[SteamService] Looking for userdata in:', userdataPath)

    if (!fs.existsSync(userdataPath)) {
        console.log('[SteamService] userdata folder does not exist')
        return []
    }

    let targetFolder: string | null = null
    const accountId = steamID64to32(userId)

    if (accountId) {
        const potentialPath = path.join(userdataPath, accountId)
        if (fs.existsSync(potentialPath)) {
            console.log('[SteamService] Found specific userdata folder for AccountID:', accountId)
            targetFolder = accountId
        }
    }

    // Fallback: Find most recently modified config
    if (!targetFolder) {
        console.log('[SteamService] Specific userdata folder not found, looking for most recent...')
        try {
            const folders = fs.readdirSync(userdataPath).filter(f => {
                return fs.statSync(path.join(userdataPath, f)).isDirectory() && /^\d+$/.test(f)
            })

            let newestTime = 0

            for (const folder of folders) {
                const configPath = path.join(userdataPath, folder, 'config/localconfig.vdf')
                if (fs.existsSync(configPath)) {
                    const stats = fs.statSync(configPath)
                    if (stats.mtimeMs > newestTime) {
                        newestTime = stats.mtimeMs
                        targetFolder = folder
                    }
                }
            }
        } catch (error) {
            console.error('[SteamService] Failed to scan userdata folders:', error)
        }
    }

    if (!targetFolder) {
        console.log('[SteamService] Could not determine target userdata folder')
        return []
    }

    const configPath = path.join(userdataPath, targetFolder, 'config/localconfig.vdf')
    console.log('[SteamService] Reading config from:', configPath)

    if (!fs.existsSync(configPath)) {
        return []
    }

    const ownedGames: OwnedGameInfo[] = []

    try {
        const content = fs.readFileSync(configPath, 'utf-8')
        const parsed = parseVdf(content)

        // Navigate to apps section
        const userLocalConfig = parsed['UserLocalConfigStore'] as VdfObject | undefined
        const software = userLocalConfig?.['Software'] as VdfObject | undefined
        const valve = software?.['Valve'] as VdfObject || software?.['valve'] as VdfObject
        const steam = valve?.['Steam'] as VdfObject || valve?.['steam'] as VdfObject
        const apps = steam?.['apps'] as VdfObject || steam?.['Apps'] as VdfObject

        if (apps) {
            for (const [appId, appData] of Object.entries(apps)) {
                if (typeof appData === 'object' && !isNaN(parseInt(appId))) {
                    const lastPlayed = parseInt(appData['LastPlayed'] as string || '0', 10)
                    const playtime = parseInt(appData['Playtime'] as string || '0', 10)

                    if (lastPlayed > 0 || playtime > 0) {
                        ownedGames.push({
                            appId,
                            lastPlayed: lastPlayed > 0 ? lastPlayed : undefined,
                            playtime: playtime > 0 ? playtime : undefined,
                        })
                    }
                }
            }
        }

        // Also check sharedconfig.vdf
        const sharedconfigPath = path.join(userdataPath, targetFolder, '7/remote/sharedconfig.vdf')
        if (fs.existsSync(sharedconfigPath)) {
            const sharedContent = fs.readFileSync(sharedconfigPath, 'utf-8')
            const sharedParsed = parseVdf(sharedContent)

            const userRoamingConfig = sharedParsed['UserRoamingConfigStore'] as VdfObject | undefined
            const software = userRoamingConfig?.['Software'] as VdfObject
            const valve = software?.['Valve'] as VdfObject || software?.['valve'] as VdfObject
            const steam = valve?.['Steam'] as VdfObject || valve?.['steam'] as VdfObject
            const apps = steam?.['apps'] as VdfObject || steam?.['Apps'] as VdfObject

            if (apps) {
                const existingIds = new Set(ownedGames.map(g => g.appId))
                for (const appId of Object.keys(apps)) {
                    if (!existingIds.has(appId) && !isNaN(parseInt(appId))) {
                        ownedGames.push({ appId })
                    }
                }
            }
        }
    } catch (error) {
        console.error('[SteamService] Failed to parse local config:', error)
    }

    console.log('[SteamService] Found', ownedGames.length, 'owned games with playtime data')
    return ownedGames
}

// ═══════════════════════════════════════════════════════════
// Game Name Resolution (local-only)
// ═══════════════════════════════════════════════════════════
//
// Primary name resolution now happens via /actions/GetOwnedApps in
// steam-session-api.ts. This module only does local-file name lookup as
// a contributor to the initial sync — getAllGames() needs SOMETHING to
// write before the network fetch fills in real names.
//
// appNameCache is populated lazily by getAppName() reading workshop ACF
// files. Most owned games won't have a workshop ACF and will fall through
// to "Game ${appId}" placeholder, which the upstream session sync replaces.

const appNameCache = new Map<string, string>()

/**
 * Look up an app name from local Steam files. Currently checks workshop
 * appworkshop_*.acf files (only present for games the user has subscribed
 * to workshop content for). Returns null for most apps — that's expected;
 * the placeholder gets replaced by the session sync upstream.
 */
export function getAppName(steamPath: string, appId: string): string | null {
    if (appNameCache.has(appId)) {
        return appNameCache.get(appId) || null
    }

    const libraryPaths = getLibraryFolders(steamPath)
    for (const libPath of libraryPaths) {
        const workshopPath = path.join(libPath, 'steamapps/workshop', `appworkshop_${appId}.acf`)
        if (fs.existsSync(workshopPath)) {
            try {
                const content = fs.readFileSync(workshopPath, 'utf-8')
                const nameMatch = content.match(/"appname"\s+"([^"]+)"/)
                if (nameMatch) {
                    appNameCache.set(appId, nameMatch[1])
                    return nameMatch[1]
                }
            } catch {
                // Continue
            }
        }
    }

    return null
}

// ═══════════════════════════════════════════════════════════
// Main Steam Service
// ═══════════════════════════════════════════════════════════

export class SteamService {
    private steamPath: string | null = null
    private libraryPaths: string[] = []
    private currentUser: SteamUser | null = null
    private cachedGames: SteamGame[] = []
    private lastSyncTime: number = 0
    private readonly CACHE_TTL = 30000 // 30 seconds

    /**
     * Initialize the Steam service
     */
    initialize(): SteamStatus {
        console.log('[SteamService] Initializing Steam service on', process.platform)

        this.steamPath = findSteamInstallation()

        if (!this.steamPath) {
            console.log('[SteamService] ❌ Steam installation NOT FOUND')
            return {
                installed: false,
                steamPath: null,
                libraryPaths: [],
                userId: null,
                username: null,
            }
        }

        console.log('[SteamService] ✓ Steam found at:', this.steamPath)

        this.libraryPaths = getLibraryFolders(this.steamPath)
        console.log('[SteamService] Library folders:', this.libraryPaths)

        this.currentUser = getMostRecentUser(this.steamPath)
        console.log('[SteamService] Current user:', this.currentUser)

        return {
            installed: true,
            steamPath: this.steamPath,
            libraryPaths: this.libraryPaths,
            userId: this.currentUser?.userId || null,
            username: this.currentUser?.username || null,
        }
    }

    /**
     * Get current Steam status
     */
    getStatus(): SteamStatus {
        if (!this.steamPath) {
            return this.initialize()
        }

        return {
            installed: true,
            steamPath: this.steamPath,
            libraryPaths: this.libraryPaths,
            userId: this.currentUser?.userId || null,
            username: this.currentUser?.username || null,
        }
    }

    /**
     * Get all Steam games (installed + owned but not installed)
     */
    getAllGames(forceRefresh: boolean = false): SteamGame[] {
        console.log('[SteamService] getAllGames called, forceRefresh:', forceRefresh)
        const now = Date.now()

        if (!forceRefresh && this.cachedGames.length > 0 && now - this.lastSyncTime < this.CACHE_TTL) {
            console.log('[SteamService] Returning cached games:', this.cachedGames.length)
            return this.cachedGames
        }

        if (!this.steamPath) {
            console.log('[SteamService] No steam path, re-initializing...')
            this.initialize()
            if (!this.steamPath) {
                console.log('[SteamService] ❌ Still no steam path after init')
                return []
            }
        }

        console.log('[SteamService] Getting installed games from library paths:', this.libraryPaths)

        // Get installed games
        const installedGames = getInstalledGames(this.libraryPaths)
        console.log('[SteamService] Installed games found:', installedGames.length)

        if (installedGames.length > 0) {
            console.log('[SteamService] First 5 installed games:', installedGames.slice(0, 5).map(g => g.name))
        }

        const installedAppIds = new Set(installedGames.map(g => g.appId))

        // Get owned games (may include non-installed)
        const allGames = [...installedGames]

        if (this.currentUser) {
            console.log('[SteamService] Getting owned games for user:', this.currentUser.userId)
            const ownedGames = getOwnedGames(this.steamPath, this.currentUser.userId)
            console.log('[SteamService] Owned games from config:', ownedGames.length)

            for (const owned of ownedGames) {
                if (!installedAppIds.has(owned.appId)) {
                    // Skip tools/runtimes
                    if (isToolOrRuntime('', owned.appId)) {
                        continue
                    }

                    // Non-installed game
                    allGames.push({
                        appId: owned.appId,
                        name: getAppName(this.steamPath, owned.appId) || `Game ${owned.appId}`,
                        isInstalled: false,
                        lastPlayed: owned.lastPlayed,
                        playtime: owned.playtime,
                    })
                } else {
                    // Update installed game with playtime info
                    const game = allGames.find(g => g.appId === owned.appId)
                    if (game) {
                        if (owned.lastPlayed) {
                            console.log(`[SteamService] Updating lastPlayed for ${game.name}: ${owned.lastPlayed}`)
                            game.lastPlayed = owned.lastPlayed
                        }
                        if (owned.playtime) {
                            game.playtime = owned.playtime
                        }
                    }
                }
            }
        } else {
            console.log('[SteamService] No current user, skipping owned games')
        }

        this.cachedGames = allGames
        this.lastSyncTime = now

        console.log('[SteamService] Total games after merge:', allGames.length)
        return allGames
    }

    /**
     * Sync Steam games with the application store
     */
    syncWithStore(store: StoreInterface): Game[] {
        console.log('[SteamService] syncWithStore called')

        const steamGames = this.getAllGames(true)
        console.log('[SteamService] Steam games to sync:', steamGames.length)

        const existingGames = store.get('games')
        console.log('[SteamService] Existing games in store:', existingGames.length)

        const existingByAppId = new Map(
            existingGames
                .filter(g => g.steamAppId)
                .map(g => [g.steamAppId!, g])
        )

        const newGames: Game[] = []
        const updatedGames: Game[] = []

        for (const steamGame of steamGames) {
            const existing = existingByAppId.get(steamGame.appId)

            if (existing) {
                // Update existing game
                const updates: Partial<Game> = {
                    isInstalled: steamGame.isInstalled,
                    title: steamGame.name !== `Game ${steamGame.appId}` ? steamGame.name : existing.title,
                }

                if (steamGame.lastPlayed) {
                    updates.lastPlayed = new Date(steamGame.lastPlayed * 1000).toISOString()
                }

                if (steamGame.sizeOnDisk) {
                    updates.sizeOnDisk = steamGame.sizeOnDisk
                }

                if (steamGame.playtime) {
                    updates.playtime = steamGame.playtime
                }

                // Only update if something changed
                if (existing.isInstalled !== updates.isInstalled ||
                    existing.title !== updates.title ||
                    existing.sizeOnDisk !== updates.sizeOnDisk ||
                    existing.playtime !== updates.playtime ||
                    existing.lastPlayed !== updates.lastPlayed) {
                    updatedGames.push({ ...existing, ...updates })
                }
            } else {
                // New game
                newGames.push({
                    id: uuidv4(),
                    title: steamGame.name,
                    steamAppId: steamGame.appId,
                    coverUrl: `https://steamcdn-a.akamaihd.net/steam/apps/${steamGame.appId}/library_600x900_2x.jpg`,
                    isInstalled: steamGame.isInstalled,
                    isFavorite: false,
                    source: 'steam',
                    lastPlayed: steamGame.lastPlayed
                        ? new Date(steamGame.lastPlayed * 1000).toISOString()
                        : undefined,
                    sizeOnDisk: steamGame.sizeOnDisk,
                    playtime: steamGame.playtime,
                })
            }
        }

        console.log('[SteamService] New games to add:', newGames.length)
        console.log('[SteamService] Updated games:', updatedGames.length)

        if (newGames.length > 0) {
            console.log('[SteamService] First 5 new games:', newGames.slice(0, 5).map(g => g.title))
        }

        // Also check for games that were uninstalled
        for (const existing of existingGames) {
            if (existing.source === 'steam' && existing.steamAppId) {
                const steamGame = steamGames.find(g => g.appId === existing.steamAppId)
                if (steamGame && existing.isInstalled !== steamGame.isInstalled) {
                    const updated = updatedGames.find(g => g.id === existing.id)
                    if (!updated) {
                        updatedGames.push({ ...existing, isInstalled: steamGame.isInstalled })
                    }
                }
            }
        }

        // Merge all games
        const allGames = existingGames.map(game => {
            const updated = updatedGames.find(u => u.id === game.id)
            return updated || game
        })

        allGames.push(...newGames)
        console.log('[SteamService] Total games after sync:', allGames.length)

        store.set('games', allGames)
        console.log('[SteamService] ✓ Store updated')

        return newGames
    }
}

// Singleton instance
export const steamService = new SteamService()
