import fs from 'node:fs'
import path from 'node:path'
import { findAchievementFiles } from './achievement-file-locations'
import { parseAchievementFile } from './parse-achievement-file'

export interface TrackingFlag {
    file: string
    key: string
    rawValue: string
    enabled: boolean | 'unknown'
}

export type TrackingSummary = 'active' | 'flag-off' | 'no-file-yet' | 'unknown'

export interface AchievementTrackingStatus {
    summary: TrackingSummary
    flags: TrackingFlag[]
    achievementFilePath?: string
    achievementFileHasProgress: boolean
}

// Matches lines like "Achievements = 0", "EnableAchievements=true",
// "AchievementsEnabled: 1" across the loader families we've seen — not tied to
// any one emulator's exact vocabulary.
const FLAG_LINE = /^\s*([A-Za-z_]*Achievements?[A-Za-z_]*)\s*[=:]\s*(\S+)\s*$/gim

function parseBool(raw: string): boolean | 'unknown' {
    const v = raw.toLowerCase().replace(/["';]/g, '')
    if (['1', 'true', 'yes', 'on'].includes(v)) return true
    if (['0', 'false', 'no', 'off'].includes(v)) return false
    return 'unknown'
}

function findIniFiles(dir: string, depth: number, out: string[]): void {
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
            findIniFiles(full, depth - 1, out)
        } else if (entry.name.toLowerCase().endsWith('.ini')) {
            out.push(full)
        }
    }
}

function scanForFlags(iniPath: string): TrackingFlag[] {
    let content: string
    try {
        content = fs.readFileSync(iniPath, 'utf8')
    } catch {
        return []
    }

    const flags: TrackingFlag[] = []
    for (const match of content.matchAll(FLAG_LINE)) {
        const [, key, rawValue] = match
        if (!key || rawValue === undefined) continue
        flags.push({ file: iniPath, key, rawValue, enabled: parseBool(rawValue) })
    }
    return flags
}

/**
 * Read-only diagnostic: is there a recognizable achievement-tracking setup for
 * this game, and does it look switched on? Never edits anything — the exact
 * enable mechanism varies too much between loader families to safely automate,
 * so this only ever tells the user what to go change themselves.
 */
export async function detectAchievementTracking(options: {
    winePrefix?: string
    gameDir?: string
}): Promise<AchievementTrackingStatus> {
    const iniFiles: string[] = []
    if (options.gameDir && fs.existsSync(options.gameDir)) {
        findIniFiles(options.gameDir, 1, iniFiles)
    }

    const flags = iniFiles.flatMap(scanForFlags)

    const candidates = findAchievementFiles(options)
    const existingFile = candidates.map((c) => c.filePath).find((f) => fs.existsSync(f))

    let achievementFileHasProgress = false
    if (existingFile) {
        try {
            const parsed = await parseAchievementFile(existingFile)
            achievementFileHasProgress = parsed.some((a) => a.achieved)
        } catch {
            // Unreadable or mid-write — leave false, not an error condition here.
        }
    }

    const off = flags.find((f) => f.enabled === false)

    let summary: TrackingSummary
    if (off) summary = 'flag-off'
    else if (existingFile) summary = 'active'
    else if (flags.length > 0) summary = 'no-file-yet'
    else summary = 'unknown'

    return {
        summary,
        flags,
        achievementFilePath: existingFile,
        achievementFileHasProgress,
    }
}
