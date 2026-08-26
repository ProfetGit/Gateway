import fs from 'node:fs'
import { spawn, type ChildProcess } from 'node:child_process'
import { UMU_COMMAND, GENERIC_UMU_GAME_ID } from './resolve-launch'
import { scanPrefixExecutables } from './scan-prefix-executables'
import { rankGameExecutables, type RankedExecutable } from './rank-game-executables'

// ═══════════════════════════════════════════════════════════
// Running a Windows installer into a fresh prefix
// ═══════════════════════════════════════════════════════════
//
// The Faugus flow, plus the part it leaves to you: we snapshot the prefix's
// executables before the installer runs and diff afterwards, so "which file is
// the game" becomes a short ranked list instead of a file browser.

export type InstallerState = 'preparing' | 'running' | 'scanning' | 'done' | 'failed' | 'cancelled'

export interface InstallerProgress {
    state: InstallerState
    message?: string
}

export interface RunInstallerOptions {
    installerPath: string
    title: string
    prefixPath: string
    protonPath?: string
}

export interface RunInstallerResult {
    success: boolean
    error?: string
    candidates: RankedExecutable[]
    /** True when the diff came up empty and we ranked the whole prefix instead. */
    scannedWholePrefix: boolean
}

let activeProcess: ChildProcess | null = null
let cancelled = false

export function isInstallerRunning(): boolean {
    return activeProcess !== null
}

/** SIGTERM the installer's whole process group. Proton spawns children. */
export function cancelWindowsInstaller(): boolean {
    if (!activeProcess?.pid) return false
    cancelled = true
    try {
        process.kill(-activeProcess.pid, 'SIGTERM')
    } catch {
        activeProcess.kill('SIGTERM')
    }
    return true
}

/** Keep the last non-empty line of installer output as the status line. */
function lastLine(chunk: string): string | undefined {
    const lines = chunk.split('\n').map((l) => l.trim()).filter(Boolean)
    return lines[lines.length - 1]
}

export async function runWindowsInstaller(
    options: RunInstallerOptions,
    onProgress: (progress: InstallerProgress) => void
): Promise<RunInstallerResult> {
    if (activeProcess) {
        return { success: false, error: 'An installer is already running.', candidates: [], scannedWholePrefix: false }
    }

    const { installerPath, title, prefixPath, protonPath } = options
    cancelled = false

    onProgress({ state: 'preparing', message: 'Setting up the game folder…' })

    try {
        fs.mkdirSync(prefixPath, { recursive: true })
    } catch (error) {
        return {
            success: false,
            error: `Couldn't create ${prefixPath}: ${(error as Error).message}`,
            candidates: [],
            scannedWholePrefix: false,
        }
    }

    if (!fs.existsSync(installerPath)) {
        return { success: false, error: "That installer file isn't there any more.", candidates: [], scannedWholePrefix: false }
    }

    const before = new Set(scanPrefixExecutables(prefixPath).map((c) => c.path))

    const env: NodeJS.ProcessEnv = {
        ...process.env,
        WINEPREFIX: prefixPath,
        GAMEID: GENERIC_UMU_GAME_ID,
        PROTON_VERB: 'waitforexitandrun',
    }
    if (protonPath) env.PROTONPATH = protonPath

    // The first run in a new prefix may download Proton and build the prefix,
    // which is slow and silent — say so rather than looking hung.
    onProgress({ state: 'running', message: 'Starting the installer. The first run can take a minute.' })

    let exitCode: number | null = null
    try {
        exitCode = await new Promise<number | null>((resolve, reject) => {
            const proc = spawn(UMU_COMMAND, [installerPath], {
                env,
                detached: true,
                stdio: ['ignore', 'pipe', 'pipe'],
            })
            activeProcess = proc

            const relay = (data: Buffer) => {
                const line = lastLine(data.toString())
                if (line) onProgress({ state: 'running', message: line })
            }
            proc.stdout?.on('data', relay)
            proc.stderr?.on('data', relay)

            proc.on('error', reject)
            proc.on('close', resolve)
        })
    } catch (error) {
        const failure = error as NodeJS.ErrnoException
        const message = failure.code === 'ENOENT'
            ? "umu-run isn't installed. Install the umu-launcher package to run Windows installers."
            : failure.message
        onProgress({ state: 'failed', message })
        return { success: false, error: message, candidates: [], scannedWholePrefix: false }
    } finally {
        activeProcess = null
    }

    if (cancelled) {
        onProgress({ state: 'cancelled', message: 'Installation stopped.' })
        return { success: false, error: 'Installation stopped.', candidates: [], scannedWholePrefix: false }
    }

    onProgress({ state: 'scanning', message: 'Looking for the game…' })

    const after = scanPrefixExecutables(prefixPath)
    const added = after.filter((c) => !before.has(c.path))

    // An installer that only replaced existing files leaves an empty diff.
    // Ranking the whole prefix still beats sending the user to a file browser.
    const scannedWholePrefix = added.length === 0
    const candidates = rankGameExecutables(scannedWholePrefix ? after : added, title)

    if (candidates.length === 0) {
        onProgress({ state: 'failed', message: "Couldn't find a game to launch." })
        return {
            success: false,
            error: exitCode === 0
                ? "The installer finished but didn't leave anything to launch. Pick the game file yourself."
                : `The installer stopped early (code ${exitCode}). Pick the game file yourself, or try again.`,
            candidates: [],
            scannedWholePrefix,
        }
    }

    onProgress({ state: 'done' })
    return { success: true, candidates, scannedWholePrefix }
}
