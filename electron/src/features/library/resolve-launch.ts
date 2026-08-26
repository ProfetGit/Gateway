import type { Game } from '../../shared/types'

// ═══════════════════════════════════════════════════════════
// Launch target resolution
// ═══════════════════════════════════════════════════════════
//
// Pure: no shell, no spawn, no fs. Returns a *description* of what to run so
// the decision can be unit-tested without side effects. library-ipc.ts owns
// the actual execution.

export type LaunchPlan =
    | { kind: 'uri'; uri: string }
    | { kind: 'spawn'; command: string; args: string[]; env: NodeJS.ProcessEnv }
    | { kind: 'none'; reason: string }

const WINDOWS_EXE = /\.(exe|msi|bat)$/i

/**
 * Parse a "VAR=value VAR2=value2" string into an env object. Splits each pair
 * on its FIRST '=' only, so values may themselves contain '='.
 */
export function parseEnvVars(customEnvVars: string | undefined): Record<string, string> {
    const env: Record<string, string> = {}
    for (const pair of (customEnvVars ?? '').trim().split(/\s+/).filter(Boolean)) {
        const eq = pair.indexOf('=')
        if (eq > 0) env[pair.slice(0, eq)] = pair.slice(eq + 1)
    }
    return env
}

/**
 * Decide how to launch a game. First match wins, and the order matters:
 * Heroic and Lutris are checked BEFORE steamAppId because both scanners may
 * attach a Steam appid purely for metadata and art. Routing such a game
 * through steam://rungameid fails silently — Steam simply does nothing. Same
 * trap as metadataAppId, two more sources.
 */
export function resolveLaunch(game: Game, baseEnv: NodeJS.ProcessEnv): LaunchPlan {
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

    if (game.executablePath) {
        const env: NodeJS.ProcessEnv = { ...baseEnv }
        // Explicit customEnvVars wins over the stored prefix.
        if (game.winePrefix) env.WINEPREFIX = game.winePrefix
        Object.assign(env, parseEnvVars(game.customEnvVars))

        const args = (game.launchArgs ?? '').trim().split(/\s+/).filter(Boolean)

        return WINDOWS_EXE.test(game.executablePath)
            ? { kind: 'spawn', command: 'wine', args: [game.executablePath, ...args], env }
            : { kind: 'spawn', command: game.executablePath, args, env }
    }

    return { kind: 'none', reason: 'No launch target configured for this game' }
}
