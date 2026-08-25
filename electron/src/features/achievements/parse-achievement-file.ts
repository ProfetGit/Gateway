import fs from 'node:fs/promises'
import path from 'node:path'

export interface ParsedAchievement {
    name: string
    achieved: boolean
    unlockTime: number
    curProgress: number
    maxProgress: number
}

/**
 * Normalizes the achievement files emulators write.
 *
 * Approach follows xan105/Achievement-Watcher: rather than branching per
 * emulator, accept every field-name spelling seen in the wild and fold them
 * into one shape. Goldberg-family writers (including the Uplay variant) use
 * `earned` / `earned_time`; others use Achieved/State/Unlocked/HaveAchieved.
 */

const IGNORED_KEYS = new Set(['SteamAchievements', 'Steam64', 'Steam'])

function toNumber(value: unknown): number {
    if (typeof value === 'number') return Number.isFinite(value) ? value : 0
    if (typeof value === 'string') {
        const n = parseInt(value, 10)
        return Number.isNaN(n) ? 0 : n
    }
    return 0
}

/**
 * Progress comes either flat (`CurProgress` / `MaxProgress`) or nested under a
 * `progress: { value, max_value }` object, which the Uplay-flavoured writers
 * use. Reading the nested form as a number would silently yield 0 and defeat
 * the completed-by-progress inference below.
 */
function readProgress(entry: Record<string, unknown>): { cur: number; max: number } {
    const nested = entry.progress
    if (nested !== null && typeof nested === 'object') {
        const p = nested as Record<string, unknown>
        return { cur: toNumber(p.value ?? p.current), max: toNumber(p.max_value ?? p.max) }
    }
    return {
        cur: toNumber(entry.CurProgress ?? entry.progress),
        max: toNumber(entry.MaxProgress ?? entry.max_progress),
    }
}

function isAchieved(entry: Record<string, unknown>, raw: unknown): boolean {
    if (raw === '1' || raw === 1 || raw === true) return true
    const truthy = (v: unknown) => v === 1 || v === '1' || v === true
    return (
        truthy(entry.Achieved) ||
        truthy(entry.achieved) ||
        truthy(entry.State) ||
        truthy(entry.HaveAchieved) ||
        truthy(entry.Unlocked) ||
        truthy(entry.unlocked) ||
        truthy(entry.earned)
    )
}

function parseIni(content: string): Record<string, Record<string, string>> {
    const result: Record<string, Record<string, string>> = {}
    let section = ''
    for (const rawLine of content.split(/\r?\n/)) {
        const line = rawLine.trim()
        if (!line || line.startsWith(';') || line.startsWith('#')) continue
        const header = line.match(/^\[(.+)\]$/)
        if (header?.[1] !== undefined) {
            section = header[1]
            result[section] = result[section] ?? {}
            continue
        }
        const eq = line.indexOf('=')
        if (eq <= 0 || !section) continue
        const bucket = result[section]
        if (bucket) bucket[line.slice(0, eq).trim()] = line.slice(eq + 1).trim()
    }
    return result
}

export function normalizeAchievementData(data: unknown): ParsedAchievement[] {
    if (data === null || typeof data !== 'object') return []

    // A JSON array of objects (the common Goldberg shape) or an object map.
    const entries: Array<[string, unknown]> = Array.isArray(data)
        ? data.map((item, i) => {
            const rec = (item ?? {}) as Record<string, unknown>
            const key = rec.name ?? rec.apiname ?? rec.id ?? String(i)
            return [String(key), item] as [string, unknown]
        })
        : Object.entries(data as Record<string, unknown>)

    const achievements: ParsedAchievement[] = []

    for (const [key, raw] of entries) {
        if (IGNORED_KEYS.has(key)) continue

        const entry = (raw !== null && typeof raw === 'object' ? raw : {}) as Record<string, unknown>
        const name = String(entry.id ?? entry.apiname ?? entry.name ?? key)
        if (!name) continue

        const { cur: curProgress, max: maxProgress } = readProgress(entry)

        let achieved = isAchieved(entry, raw)
        // Some writers only record progress and never flip the flag.
        if (!achieved && maxProgress > 0 && curProgress > 0 && curProgress === maxProgress) {
            achieved = true
        }

        achievements.push({
            name,
            achieved,
            unlockTime: toNumber(
                entry.UnlockTime ?? entry.unlocktime ?? entry.HaveAchievedTime ?? entry.Time ?? entry.earned_time,
            ),
            curProgress,
            maxProgress,
        })
    }

    return achievements.sort((a, b) => b.unlockTime - a.unlockTime)
}

export async function parseAchievementFile(filePath: string): Promise<ParsedAchievement[]> {
    const content = await fs.readFile(filePath, 'utf8')
    if (path.extname(filePath).toLowerCase() === '.json') {
        return normalizeAchievementData(JSON.parse(content))
    }
    const ini = parseIni(content)
    // INI writers nest under a container section in some builds.
    const container = ini.ACHIEVE_DATA ?? ini.Achievements
    return normalizeAchievementData(container ?? ini)
}
