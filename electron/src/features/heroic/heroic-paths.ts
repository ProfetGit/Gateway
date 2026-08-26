import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// ═══════════════════════════════════════════════════════════
// Heroic data locations
// ═══════════════════════════════════════════════════════════
//
// Everything Gateway reads here is READ-ONLY. Heroic owns these files.

const HEROIC_DATA_PATHS = [
    path.join(os.homedir(), '.config/heroic'),
    // Flatpak
    path.join(os.homedir(), '.var/app/com.heroicgameslauncher.hgl/config/heroic'),
]

/** config.json is the marker for a real Heroic install, not just a stray dir. */
export function getHeroicDataPath(): string | null {
    for (const dataPath of HEROIC_DATA_PATHS) {
        if (fs.existsSync(path.join(dataPath, 'config.json'))) return dataPath
    }
    return null
}

export function safeReadJson<T>(filePath: string): T | null {
    try {
        if (!fs.existsSync(filePath)) return null
        return JSON.parse(fs.readFileSync(filePath, 'utf-8')) as T
    } catch (error) {
        console.warn(`[Heroic] Could not read ${filePath}:`, error)
        return null
    }
}

/**
 * Heroic's locally cached icon, used as cover art when a game has no remote
 * art URL (GOG entries generally don't).
 */
export function getHeroicCoverPath(appName: string): string | null {
    const dataPath = getHeroicDataPath()
    if (!dataPath) return null

    for (const ext of ['jpg', 'png']) {
        const iconPath = path.join(dataPath, 'icons', `${appName}.${ext}`)
        if (fs.existsSync(iconPath)) return iconPath
    }
    return null
}
