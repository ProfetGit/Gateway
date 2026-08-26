import type { Game, LaunchRunner } from '../../game-library-types'

// ═══════════════════════════════════════════════════════════
// Properties form <-> Game translation
// ═══════════════════════════════════════════════════════════
//
// Pure, so it can be tested — vitest runs in a node environment here, with no
// DOM and no React Testing Library, so nothing that renders can be covered.
// The interesting behaviour is the clearing semantics anyway: `update_game`
// treats an explicit `undefined` as "delete this key", which is the only way
// to empty a field the user has already filled in.

export interface GamePropertiesDraft {
    title: string
    executablePath: string
    coverUrl: string
    notes: string
    runner: LaunchRunner
    protonPath: string
    winePrefix: string
    umuGameId: string
    launchArgs: string
    customEnvVars: string
    useMangoHud: boolean
    useGameMode: boolean
}

/** Text fields, and the Game key each one writes. */
const TEXT_FIELDS = [
    'title',
    'executablePath',
    'coverUrl',
    'notes',
    'protonPath',
    'winePrefix',
    'umuGameId',
    'launchArgs',
    'customEnvVars',
] as const satisfies readonly (keyof GamePropertiesDraft & keyof Game)[]

export function draftFromGame(game: Game): GamePropertiesDraft {
    return {
        title: game.title,
        executablePath: game.executablePath ?? '',
        coverUrl: game.coverUrl ?? '',
        notes: game.notes ?? '',
        runner: game.runner ?? 'auto',
        protonPath: game.protonPath ?? '',
        winePrefix: game.winePrefix ?? '',
        umuGameId: game.umuGameId ?? '',
        launchArgs: game.launchArgs ?? '',
        customEnvVars: game.customEnvVars ?? '',
        useMangoHud: game.useMangoHud ?? false,
        useGameMode: game.useGameMode ?? false,
    }
}

/**
 * The patch to send to update_game. Only fields the user actually changed are
 * included, so a save can never resurrect a value another sync just wrote.
 *
 * A cleared text field becomes an explicit `undefined` rather than `''` —
 * storing an empty string would make `game.winePrefix` truthy-check false but
 * still ship a useless key, and would leave `runner: ''` failing the schema.
 */
export function buildUpdates(game: Game, draft: GamePropertiesDraft): Partial<Game> {
    const updates: Partial<Game> = {}

    for (const field of TEXT_FIELDS) {
        const next = draft[field].trim()
        const current = (game[field] as string | undefined) ?? ''
        if (next === current) continue
        // title is required; an empty one is rejected before we get here.
        Object.assign(updates, { [field]: next === '' ? undefined : next })
    }

    // 'auto' is the absence of a choice, so it clears the field rather than
    // persisting a value that means "no value".
    const nextRunner = draft.runner === 'auto' ? undefined : draft.runner
    if (nextRunner !== game.runner) updates.runner = nextRunner

    if (draft.useMangoHud !== (game.useMangoHud ?? false)) updates.useMangoHud = draft.useMangoHud
    if (draft.useGameMode !== (game.useGameMode ?? false)) updates.useGameMode = draft.useGameMode

    return updates
}

export function isDirty(game: Game, draft: GamePropertiesDraft): boolean {
    return Object.keys(buildUpdates(game, draft)).length > 0
}

export function canSave(draft: GamePropertiesDraft): boolean {
    return draft.title.trim().length > 0
}

/**
 * Whether the compatibility fields apply at all. Heroic, Lutris and owned
 * Steam games launch through their own launcher, so a Proton build set here
 * would be quietly ignored — better to say so than to offer a dead control.
 */
export function usesGatewayRuntime(game: Game): boolean {
    return !game.heroicAppName && game.lutrisId == null && !game.steamAppId
}
