import type { Game } from './types'

// ═══════════════════════════════════════════════════════════
// Steam appdetails `type` normalization
// ═══════════════════════════════════════════════════════════
//
// Steam's appdetails endpoint returns a free-form `type` string. Writing it
// into the store unchecked is what put appType:"advertising" on a Call of Duty
// entry and — before the reader became tolerant — emptied the whole library on
// every restart. Normalize at the boundary so unknown values never reach disk.

const KNOWN_APP_TYPES = new Set<string>([
    'game',
    'dlc',
    'demo',
    'mod',
    'application',
    'music',
    'video',
    'series',
    'episode',
    'advertising',
    'hardware',
])

/**
 * Map a raw Steam type onto a value we recognise. Anything unknown becomes
 * 'application', which the library filter already hides — an unrecognised
 * entry is far more likely to be a non-game than a game.
 */
export function normalizeAppType(rawType: string): Game['appType'] {
    const normalized = rawType.trim().toLowerCase()
    if (KNOWN_APP_TYPES.has(normalized)) return normalized as Game['appType']

    console.warn(`[Sync] Unknown Steam app type "${rawType}", treating as application`)
    return 'application'
}
