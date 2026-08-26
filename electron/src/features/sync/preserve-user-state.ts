import type { Game } from '../../shared/types'

// ═══════════════════════════════════════════════════════════
// Surviving a clear-and-resync
// ═══════════════════════════════════════════════════════════
//
// clear_and_resync empties the library and rebuilds it from the scanners. That
// is fine for anything a scanner can rebuild, and destructive for everything
// else:
//
//   - `source: 'manual'` rows have NO scanner. The user typed them in; wiping
//     them is unrecoverable, and the button that does it says "Refresh
//     Library".
//   - Rebuilt rows come back as brand new records, losing the state the user
//     put on them — favourites, notes, a Steam match, launch tweaks, and
//     `manualUnlocks`, which is the only record of achievement progress for
//     games Steam cannot report on.
//
// Pure, so both halves are testable without a store or a network.

/**
 * Fields a scanner never produces, so restoring them can't shadow fresher
 * scanned data. Mirrors `carryOver` in shared/merge-source-games.ts, plus the
 * per-game launch settings.
 *
 * Deliberately NOT here: `executablePath` and `winePrefix`. The shortcut
 * scanner owns both, and a stale value would outrank the real one.
 */
export const USER_OWNED_FIELDS = [
    'isFavorite',
    'notes',
    'manualUnlocks',
    'metadataAppId',
    'runner',
    'protonPath',
    'umuGameId',
    'useMangoHud',
    'useGameMode',
    'launchArgs',
    'customEnvVars',
] as const satisfies readonly (keyof Game)[]

/**
 * Stable identity across a rebuild. Ids are regenerated, so a row can only be
 * recognised by whatever its source keys on.
 */
export function identityKey(game: Game): string | undefined {
    if (game.heroicAppName && game.heroicRunner) return `heroic:${game.heroicRunner}:${game.heroicAppName}`
    if (game.lutrisId != null) return `lutris:${game.lutrisId}`
    if (game.shortcutId) return `shortcut:${game.shortcutId}`
    if (game.steamAppId) return `steam:${game.steamAppId}`
    return undefined
}

/** Rows nothing can rebuild, and which therefore must survive the clear. */
export function unrebuildableGames(games: Game[]): Game[] {
    return games.filter((game) => game.source === 'manual')
}

/**
 * Fold the user's own state from the pre-clear library back onto the rebuilt
 * rows. `isFavorite` is required on Game, so it is only restored when it was
 * actually set — a rebuilt row already defaults it to false.
 */
export function restoreUserState(rebuilt: Game[], previous: Game[]): Game[] {
    const byKey = new Map<string, Game>()
    for (const game of previous) {
        const key = identityKey(game)
        if (key !== undefined && !byKey.has(key)) byKey.set(key, game)
    }
    if (byKey.size === 0) return rebuilt

    return rebuilt.map((game) => {
        const key = identityKey(game)
        const old = key === undefined ? undefined : byKey.get(key)
        if (!old) return game

        const restored: Game = { ...game }
        for (const field of USER_OWNED_FIELDS) {
            const value = old[field]
            if (value === undefined) continue
            if (field === 'isFavorite' && value === false) continue
            Object.assign(restored, { [field]: value })
        }
        return restored
    })
}
