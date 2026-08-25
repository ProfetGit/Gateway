import type { LutrisCliGame } from './lutris-types'
import type { Game } from '../../shared/types'

// ═══════════════════════════════════════════════════════════
// Lutris CLI output parsing
// ═══════════════════════════════════════════════════════════
//
// Pure: no fs, no child_process. Takes the raw stdout text and returns
// typed rows, so it can be tested without Lutris installed.

function asRecord(value: unknown): Record<string, unknown> | null {
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? (value as Record<string, unknown>)
        : null
}

function str(value: unknown): string | null {
    return typeof value === 'string' && value ? value : null
}

/**
 * Slice out the JSON array from stdout. Lutris logs to stderr, but it boots a
 * full GTK application and a stray line reaching stdout would otherwise take
 * down the whole import — so be defensive rather than trusting the stream.
 */
export function extractJsonArray(stdout: string): unknown[] {
    const start = stdout.indexOf('[')
    const end = stdout.lastIndexOf(']')
    if (start === -1 || end === -1 || end < start) return []

    try {
        const parsed = JSON.parse(stdout.slice(start, end + 1))
        return Array.isArray(parsed) ? parsed : []
    } catch {
        return []
    }
}

export function parseLutrisGames(raw: unknown[]): LutrisCliGame[] {
    const games: LutrisCliGame[] = []
    for (const entry of raw) {
        const row = asRecord(entry)
        if (!row) continue

        const id = typeof row.id === 'number' ? row.id : Number(row.id)
        const slug = str(row.slug)
        const name = str(row.name)
        if (!Number.isFinite(id) || !slug || !name) continue

        games.push({
            id,
            slug,
            name,
            runner: str(row.runner),
            platform: str(row.platform),
            directory: str(row.directory),
            // NEVER read row.playtime — it is a "1:23:45" timedelta string.
            playtimeSeconds:
                typeof row.playtimeSeconds === 'number' && Number.isFinite(row.playtimeSeconds)
                    ? row.playtimeSeconds
                    : null,
            lastplayed: str(row.lastplayed),
            coverPath: str(row.coverPath),
        })
    }
    return games
}

/**
 * Lutris emits `str(datetime.fromtimestamp(...))` — "2026-08-25 21:33:15",
 * LOCAL time with no zone and a space instead of 'T'. Replacing the space
 * yields a valid local-time ISO literal; appending 'Z' would be wrong by the
 * machine's UTC offset and silently misorder "last played".
 */
export function parseLutrisTimestamp(value: string | null): string | undefined {
    if (!value) return undefined
    const date = new Date(value.replace(' ', 'T'))
    return Number.isNaN(date.getTime()) ? undefined : date.toISOString()
}

/**
 * A Lutris game installed from Steam carries a `steam-<appid>` slug. The CLI
 * JSON exposes no service/service_id columns, so this slug heuristic is all
 * that survives from the old sqlite-backed scanner.
 */
export function resolveLutrisSteamAppId(slug: string): string | null {
    return /^steam-(\d+)$/.exec(slug)?.[1] ?? null
}

export function toGameFields(game: LutrisCliGame, isInstalled: boolean): Omit<Game, 'id'> {
    return {
        title: game.name,
        source: 'lutris',
        lutrisId: game.id,
        lutrisSlug: game.slug,
        isInstalled,
        isFavorite: false,
        ...(game.playtimeSeconds != null && { playtime: Math.round(game.playtimeSeconds / 60) }),
        ...(parseLutrisTimestamp(game.lastplayed) && {
            lastPlayed: parseLutrisTimestamp(game.lastplayed),
        }),
    }
}
