import type { Game } from '../../shared/types'

// ═══════════════════════════════════════════════════════════
// "Do I already own this Epic freebie?"
// ═══════════════════════════════════════════════════════════
//
// Gateway can't ask Epic directly — it has no Epic session. What it does have
// is the library Heroic already imported, where every legendary-runner row is
// an Epic entitlement. Matching a giveaway title against those rows is enough
// to grey out the ones the user claimed in a previous week.
//
// Matching is on normalised titles only, and deliberately conservative: the
// consequence of a false positive is a game the user still needs showing as
// already claimed, i.e. a missed freebie. Sloppy fuzzy matching is worse than
// no matching at all, so nothing here does substring or edit-distance work.
//
// The edition suffixes below are stripped because Epic's giveaway listing and
// the entitlement it grants routinely disagree on them — the store advertises
// "Cardpocalypse Standard Edition" while the library row reads "Cardpocalypse".

const EDITION_SUFFIXES = [
    'standard edition',
    'definitive edition',
    'complete edition',
    'deluxe edition',
    'ultimate edition',
    'enhanced edition',
    'game of the year edition',
    'goty edition',
    'special edition',
    'anniversary edition',
    'digital edition',
    'desktop edition',
]

/**
 * Lowercase, drop a trailing edition suffix, then strip every non-alphanumeric
 * character. That last step collapses the punctuation Epic and legendary
 * disagree on ("Them's Fightin' Herds" vs "Thems Fightin Herds", trademark
 * symbols, stray whitespace) without letting unrelated titles collide.
 */
export function normalizeEpicTitle(title: string): string {
    let normalized = title.toLowerCase().trim()

    for (const suffix of EDITION_SUFFIXES) {
        // Tolerate the "Title: Deluxe Edition" and "Title - Deluxe Edition" forms.
        const pattern = new RegExp(`[\\s:\\-–—]*${suffix}$`)
        if (pattern.test(normalized)) {
            normalized = normalized.replace(pattern, '')
            break
        }
    }

    return normalized.replace(/[^a-z0-9]/g, '')
}

/** Normalised titles of every Epic (legendary-runner) game already in the library. */
export function ownedEpicTitles(games: Game[]): Set<string> {
    const owned = new Set<string>()
    for (const game of games) {
        if (game.source !== 'heroic' || game.heroicRunner !== 'legendary') continue
        const key = normalizeEpicTitle(game.title)
        if (key) owned.add(key)
    }
    return owned
}

export function isEpicTitleOwned(title: string, owned: Set<string>): boolean {
    const key = normalizeEpicTitle(title)
    return key.length > 0 && owned.has(key)
}
