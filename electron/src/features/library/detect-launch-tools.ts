import fs from 'node:fs'
import os from 'node:os'
import path from 'node:path'

// ═══════════════════════════════════════════════════════════
// Launch tooling discovery
// ═══════════════════════════════════════════════════════════
//
// Detection is by PATH lookup, not by running anything. Executing --version on
// four binaries at startup costs real time, and `wine` in particular will
// happily initialise a prefix as a side effect.

export interface LaunchTools {
    umu: boolean
    wine: boolean
    gamemode: boolean
    mangohud: boolean
}

export interface ProtonBuild {
    name: string
    path: string
}

/** Directories Proton builds are installed into, by every launcher that does it. */
const PROTON_SEARCH_DIRS = [
    path.join(os.homedir(), '.steam/root/compatibilitytools.d'),
    path.join(os.homedir(), '.local/share/Steam/compatibilitytools.d'),
    path.join(os.homedir(), '.var/app/com.valvesoftware.Steam/data/Steam/compatibilitytools.d'),
    path.join(os.homedir(), '.config/heroic/tools/proton'),
    path.join(os.homedir(), '.local/share/umu/compatibilitytools'),
]
// Deliberately NOT steamapps/common: the builds Valve manages there are
// Steam's business, umu ships its own, and scanning a few hundred game
// directories to find them costs more than it returns.

export function isOnPath(command: string): boolean {
    const entries = (process.env.PATH ?? '').split(path.delimiter).filter(Boolean)
    for (const dir of entries) {
        try {
            fs.accessSync(path.join(dir, command), fs.constants.X_OK)
            return true
        } catch {
            // Not here, or not executable — keep looking.
        }
    }
    return false
}

export function detectLaunchTools(): LaunchTools {
    return {
        umu: isOnPath('umu-run'),
        wine: isOnPath('wine'),
        gamemode: isOnPath('gamemoderun'),
        mangohud: isOnPath('mangohud'),
    }
}

/**
 * A directory is a Proton build if it carries the `proton` entry script. Steam
 * also parks unrelated things in compatibilitytools.d (Luxtorpeda, Boxtron,
 * loose .vdf files), and offering those in the dropdown would produce a game
 * that fails to start with no clue why.
 */
export function isProtonBuildDir(dir: string): boolean {
    return fs.existsSync(path.join(dir, 'proton'))
}

/**
 * Dedupe and order builds for the picker. ~/.steam/root is usually a symlink
 * into ~/.local/share/Steam, so the same build is found twice under different
 * paths — collapsing by resolved path keeps one entry.
 */
export function dedupeProtonBuilds(builds: ProtonBuild[]): ProtonBuild[] {
    const byKey = new Map<string, ProtonBuild>()
    for (const build of builds) {
        if (!byKey.has(build.name)) byKey.set(build.name, build)
    }
    return [...byKey.values()].sort((a, b) =>
        a.name.localeCompare(b.name, 'en', { numeric: true, sensitivity: 'base' })
    )
}

export function listProtonBuilds(extraDirs: string[] = []): ProtonBuild[] {
    const found: ProtonBuild[] = []

    for (const searchDir of [...PROTON_SEARCH_DIRS, ...extraDirs]) {
        let entries: fs.Dirent[]
        try {
            entries = fs.readdirSync(searchDir, { withFileTypes: true })
        } catch {
            continue
        }

        for (const entry of entries) {
            if (!entry.isDirectory() && !entry.isSymbolicLink()) continue
            const full = path.join(searchDir, entry.name)
            if (!isProtonBuildDir(full)) continue
            found.push({ name: entry.name, path: fs.realpathSync.native(full) })
        }
    }

    return dedupeProtonBuilds(found)
}
