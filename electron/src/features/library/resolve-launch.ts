import type { Game, LaunchRunner } from '../../shared/types'
import { tokenizeArgs, parseEnvVars } from './tokenize-args'

// ═══════════════════════════════════════════════════════════
// Launch target resolution
// ═══════════════════════════════════════════════════════════
//
// Pure: no shell, no spawn, no fs. Returns a *description* of what to run so
// the decision can be unit-tested without side effects. library-ipc.ts owns
// the actual execution.

export type SpawnRunner = 'umu' | 'wine' | 'native'

export type LaunchPlan =
    | { kind: 'uri'; uri: string }
    | { kind: 'spawn'; command: string; args: string[]; env: NodeJS.ProcessEnv; runner: SpawnRunner }
    | { kind: 'none'; reason: string }

const WINDOWS_EXE = /\.(exe|msi|bat)$/i

export const UMU_COMMAND = 'umu-run'
export const WINE_COMMAND = 'wine'
export const GAMEMODE_COMMAND = 'gamemoderun'
export const MANGOHUD_COMMAND = 'mangohud'

// umu requires a GAMEID. 'umu-<steam appid>' is the key protonfixes looks up;
// '0' is the documented generic value for a title it knows nothing about.
export const GENERIC_UMU_GAME_ID = '0'

export { parseEnvVars }

/**
 * Which runtime actually starts `executablePath`.
 *
 * `game.runner` is authoritative when set. 'auto' (and undefined, which is the
 * same thing for every row written before the field existed) infers from the
 * file extension. Windows binaries prefer umu — Proton plus the Steam Linux
 * Runtime container plus protonfixes — and fall back to bare wine only when
 * umu-launcher isn't installed, where the alternative is not launching at all.
 */
export function resolveRunner(game: Game, umuAvailable: boolean): SpawnRunner {
    const explicit: LaunchRunner = game.runner ?? 'auto'
    if (explicit !== 'auto') return explicit

    if (WINDOWS_EXE.test(game.executablePath ?? '')) {
        return umuAvailable ? 'umu' : 'wine'
    }
    return 'native'
}

/**
 * Decide how to launch a game. First match wins, and the order matters:
 * Heroic and Lutris are checked BEFORE steamAppId because both scanners may
 * attach a Steam appid purely for metadata and art. Routing such a game
 * through steam://rungameid fails silently — Steam simply does nothing. Same
 * trap as metadataAppId, two more sources.
 */
export function resolveLaunch(
    game: Game,
    baseEnv: NodeJS.ProcessEnv,
    umuAvailable = false
): LaunchPlan {
    if (game.heroicAppName && game.heroicRunner) {
        // Epic app names are opaque ids, but GOG and sideloaded entries carry
        // human-chosen names — a space or '#' would otherwise produce a
        // malformed URI that the handler silently drops.
        const appName = encodeURIComponent(game.heroicAppName)
        return { kind: 'uri', uri: `heroic://launch/${game.heroicRunner}/${appName}` }
    }

    // Single colon — lutris:rungameid/<id>, not lutris://
    if (game.lutrisId != null) {
        return { kind: 'uri', uri: `lutris:rungameid/${game.lutrisId}` }
    }

    if (game.steamAppId) {
        return { kind: 'uri', uri: `steam://rungameid/${game.steamAppId}` }
    }

    const executablePath = game.executablePath
    if (!executablePath) {
        return { kind: 'none', reason: 'No launch target configured for this game' }
    }

    const runner = resolveRunner(game, umuAvailable)
    const env: NodeJS.ProcessEnv = { ...baseEnv }

    if (game.winePrefix) env.WINEPREFIX = game.winePrefix

    if (runner === 'umu') {
        // umu derives STEAM_COMPAT_* from WINEPREFIX itself and creates
        // <prefix>/pfx — the same layout driveC() in the achievements feature
        // already knows how to read.
        // metadataAppId, not steamAppId: a game we own on Steam never reaches
        // the spawn branch at all (it left as a steam:// URI above). The
        // titles that get here are the ones matched to a Steam entry purely
        // for art and metadata — which is precisely the id protonfixes wants.
        env.GAMEID = game.umuGameId
            ?? (game.metadataAppId ? `umu-${game.metadataAppId}` : GENERIC_UMU_GAME_ID)
        env.PROTON_VERB = 'waitforexitandrun'
        if (game.protonPath) env.PROTONPATH = game.protonPath
    }

    // Inside the umu container (and under wine) the game renders through
    // DXVK/VKD3D, so the Vulkan implicit layer is the switch that works.
    // Wrapping umu-run in the `mangohud` script instead does nothing visible.
    // Native Linux games may still be OpenGL, so those get the wrapper.
    if (game.useMangoHud && runner !== 'native') env.MANGOHUD = '1'

    // Explicit customEnvVars wins over everything above — it is the escape
    // hatch for a game that needs a different prefix, PROTONPATH or GAMEID.
    Object.assign(env, parseEnvVars(game.customEnvVars))

    const chain: string[] = []
    if (game.useGameMode) chain.push(GAMEMODE_COMMAND)
    if (runner === 'umu') chain.push(UMU_COMMAND)
    else if (runner === 'wine') chain.push(WINE_COMMAND)
    else if (game.useMangoHud) chain.push(MANGOHUD_COMMAND)
    chain.push(executablePath, ...tokenizeArgs(game.launchArgs))

    // chain always holds at least the executable itself.
    const [command, ...args] = chain as [string, ...string[]]
    return { kind: 'spawn', command, args, env, runner }
}
