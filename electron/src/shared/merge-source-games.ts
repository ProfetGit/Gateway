import type { Game } from './types'

// ═══════════════════════════════════════════════════════════
// Per-source library merge
// ═══════════════════════════════════════════════════════════
//
// Pure. Used by the Heroic and Lutris syncs to fold a freshly scanned list
// into the stored library without disturbing any other source's rows.

/** A scanned game, keyed by whatever identity its source is stable on. */
export interface IncomingGame {
    key: string
    fields: Omit<Game, 'id'>
}

/**
 * User-owned state that a re-scan must never clobber. `manualUnlocks` matters
 * most: it is the only record of achievement progress for games Steam can't
 * report on, and dropping it is unrecoverable.
 */
function carryOver(existing: Game, fields: Omit<Game, 'id'>): Game {
    return {
        ...fields,
        id: existing.id,
        isFavorite: existing.isFavorite,
        ...(existing.notes !== undefined && { notes: existing.notes }),
        ...(existing.manualUnlocks !== undefined && { manualUnlocks: existing.manualUnlocks }),
        ...(existing.metadataAppId !== undefined && { metadataAppId: existing.metadataAppId }),
    }
}

/**
 * Replace every row of `source` with `incoming`, leaving all other sources
 * untouched. Rows of `source` that are no longer present upstream are dropped
 * — an uninstalled/removed Heroic or Lutris game should leave the library.
 *
 * `makeId` is injected so tests are deterministic; production passes uuidv4.
 */
export function mergeSourceGames(
    current: Game[],
    incoming: IncomingGame[],
    source: Game['source'],
    keyOf: (game: Game) => string | undefined,
    makeId: () => string,
): Game[] {
    const existingByKey = new Map<string, Game>()
    for (const game of current) {
        if (game.source !== source) continue
        const key = keyOf(game)
        if (key !== undefined) existingByKey.set(key, game)
    }

    const untouched = current.filter((game) => game.source !== source)
    const merged = incoming.map(({ key, fields }) => {
        const existing = existingByKey.get(key)
        return existing ? carryOver(existing, fields) : { ...fields, id: makeId() }
    })

    return [...untouched, ...merged]
}
