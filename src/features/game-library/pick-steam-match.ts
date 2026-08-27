import type { SteamMatchHit } from './components/SteamMatchResults'

export interface SteamMatchChoice {
    /** Auto-linked only on a confident match. Null means "ask the user". */
    exact: SteamMatchHit | null
    /** Near misses to offer as one-click alternatives. */
    suggestions: SteamMatchHit[]
}

const MAX_SUGGESTIONS = 3

/**
 * Trademark noise and punctuation differ between a filename and Steam's own
 * catalogue entry, so `Hollow Knight Silksong` must still match
 * `Hollow Knight: Silksong™`.
 */
export function normaliseTitle(title: string): string {
    return title
        .toLowerCase()
        .replace(/[™®©]/g, '')
        .replace(/&/g, ' and ')
        .replace(/[^a-z0-9]+/g, ' ')
        .trim()
}

/**
 * Decides whether a search result is safe to link automatically.
 *
 * Only an exact normalised title auto-links. A wrong link is not cosmetic — it
 * attaches the wrong cover AND the wrong achievement set to a game the user
 * never got asked about, and the same "a false positive is worse than no badge"
 * reasoning already governs Epic ownership matching. Everything short of exact
 * is offered as a suggestion instead.
 */
export function pickSteamMatch(derivedTitle: string, hits: SteamMatchHit[]): SteamMatchChoice {
    const needle = normaliseTitle(derivedTitle)
    if (!needle || hits.length === 0) return { exact: null, suggestions: hits.slice(0, MAX_SUGGESTIONS) }

    const exact = hits.find((hit) => normaliseTitle(hit.name) === needle) ?? null

    return {
        exact,
        suggestions: exact ? [] : hits.slice(0, MAX_SUGGESTIONS),
    }
}
