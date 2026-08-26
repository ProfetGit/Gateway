import fs from 'node:fs'
import path from 'node:path'

export interface AchievementFileCandidate {
    filePath: string
    /** Directory to watch — the file often doesn't exist until the first unlock. */
    watchDir: string
}

const ACHIEVEMENT_FILENAMES = [
    'achievements.json',
    'achievements.ini',
    'achiev.ini',
    'stats.ini',
    'Achievements.ini',
]

// Paths relative to a wine prefix's drive_c. Achievement Watcher reads these
// from %APPDATA%/%LOCALAPPDATA% on Windows; under Proton the same layout lives
// inside the prefix. Only families known to write JSON/INI (readable by our
// parser) are listed — a few loaders use opaque binary formats and are out of
// scope until there's a real sample to reverse.
const PREFIX_RELATIVE_DIRS = [
    'users/steamuser/AppData/Roaming/Goldberg SteamEmu Saves',
    'users/steamuser/AppData/Roaming/Goldberg UplayEmu Saves',
    'users/steamuser/AppData/Roaming/GSE Saves',
    'users/steamuser/AppData/Roaming/Steam/CODEX',
    'users/steamuser/AppData/Roaming/EMPRESS',
    'users/steamuser/AppData/Roaming/OnlineFix',
    'users/steamuser/AppData/Roaming/CPY',
    'users/steamuser/AppData/Roaming/RUNE',
    'users/steamuser/AppData/Roaming/FitGirl',
    'users/steamuser/AppData/Local/Goldberg SteamEmu Saves',
]

export function driveC(prefix: string): string {
    // Faugus/umu prefixes appear both as <prefix>/drive_c and <prefix>/pfx/drive_c.
    const nested = path.join(prefix, 'pfx', 'drive_c')
    if (fs.existsSync(nested)) return nested
    return path.join(prefix, 'drive_c')
}

function collectFiles(dir: string, depth: number, out: string[]): void {
    if (depth < 0) return
    let entries: fs.Dirent[]
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
        return
    }
    for (const entry of entries) {
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) {
            collectFiles(full, depth - 1, out)
        } else if (ACHIEVEMENT_FILENAMES.includes(entry.name)) {
            out.push(full)
        }
    }
}

/**
 * Finds achievement files for a game, given its wine prefix and/or the folder
 * its executable lives in. Returns both the files that exist now and the
 * directories worth watching for ones that appear later.
 */
export function findAchievementFiles(options: {
    winePrefix?: string
    gameDir?: string
}): AchievementFileCandidate[] {
    const candidates: AchievementFileCandidate[] = []
    const seen = new Set<string>()

    const push = (filePath: string, watchDir: string) => {
        if (seen.has(filePath)) return
        seen.add(filePath)
        candidates.push({ filePath, watchDir })
    }

    if (options.winePrefix) {
        const root = driveC(options.winePrefix)
        for (const rel of PREFIX_RELATIVE_DIRS) {
            const dir = path.join(root, rel)
            if (!fs.existsSync(dir)) continue
            const found: string[] = []
            collectFiles(dir, 3, found)
            for (const file of found) push(file, dir)
            if (found.length === 0) push(path.join(dir, 'achievements.json'), dir)
        }
    }

    // Some emulators write next to the executable instead (e.g. a portable
    // Goldberg build with steam_settings/ beside the exe, no redirect to APPDATA).
    if (options.gameDir && fs.existsSync(options.gameDir)) {
        const found: string[] = []
        collectFiles(options.gameDir, 2, found)
        for (const file of found) push(file, options.gameDir)
    }

    return candidates
}

export function watchDirsFor(candidates: AchievementFileCandidate[]): string[] {
    return [...new Set(candidates.map((c) => c.watchDir))].filter((dir) => fs.existsSync(dir))
}

export { ACHIEVEMENT_FILENAMES }
