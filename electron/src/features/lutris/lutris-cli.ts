import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

// ═══════════════════════════════════════════════════════════
// Lutris CLI bridge
// ═══════════════════════════════════════════════════════════
//
// Lutris exposes `--list-games --json`, which is why Gateway reads it through
// the CLI rather than opening pga.db directly — parsing the SQLite store would
// mean a native better-sqlite3 dependency and an electron-rebuild step.
//
// IMPORTANT: invoking the `lutris` binary boots a full GTK application and
// runs its database migrations (~2s on a cold first run, and it will create
// ~/.local/share/lutris if absent). So:
//   - never call this on app start; it is user-initiated only
//   - always keep the timeout
//   - if the Lutris GUI is already running, the call is routed to that
//     instance over DBus, which is fine but can lag
//
// JSON goes to stdout, logs go to stderr. stderr is ignored entirely.

const TIMEOUT_MS = 15_000
const MAX_BUFFER = 16 * 1024 * 1024

/** Returns stdout, or null when Lutris is not installed or the call failed. */
export async function runLutrisJson(args: string[]): Promise<string | null> {
    try {
        const { stdout } = await execFileAsync('lutris', args, {
            encoding: 'utf8',
            timeout: TIMEOUT_MS,
            maxBuffer: MAX_BUFFER,
        })
        return stdout
    } catch (error) {
        const code = (error as NodeJS.ErrnoException).code
        if (code !== 'ENOENT') {
            console.warn('[Lutris] CLI call failed:', error)
        }
        return null
    }
}

export function isLutrisInstalled(): Promise<boolean> {
    return runLutrisJson(['--list-games', '--json']).then((out) => out !== null)
}
