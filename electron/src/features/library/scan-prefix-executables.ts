import fs from 'node:fs'
import path from 'node:path'
import { driveC } from '../achievements/achievement-file-locations'
import type { ExecutableCandidate } from './rank-game-executables'

// ═══════════════════════════════════════════════════════════
// Walking a Wine prefix for launchable files
// ═══════════════════════════════════════════════════════════
//
// Both caps are load-bearing. A prefix can contain a Windows system tree, a
// game with tens of thousands of asset files, and — if the user pointed it at
// the wrong folder — their entire home directory. This runs on the main
// process, so an unbounded walk freezes the window.

const MAX_DEPTH = 8
const MAX_FILES_VISITED = 200_000
const LAUNCHABLE = /\.(exe|bat)$/i

// Never worth descending into. Cuts the vast majority of the walk.
const SKIP_DIRS = new Set([
    'windows',
    '$recycle.bin',
    'system volume information',
    'programdata',
])

interface WalkState {
    found: ExecutableCandidate[]
    visited: number
}

function walk(dir: string, depth: number, state: WalkState): void {
    if (depth > MAX_DEPTH || state.visited >= MAX_FILES_VISITED) return

    let entries: fs.Dirent[]
    try {
        entries = fs.readdirSync(dir, { withFileTypes: true })
    } catch {
        return
    }

    for (const entry of entries) {
        if (state.visited >= MAX_FILES_VISITED) return
        state.visited++

        const full = path.join(dir, entry.name)

        if (entry.isDirectory()) {
            if (SKIP_DIRS.has(entry.name.toLowerCase())) continue
            walk(full, depth + 1, state)
            continue
        }

        // Symlinks are not followed: a prefix commonly links drive_z to /, and
        // following that walks the whole filesystem.
        if (!entry.isFile() || !LAUNCHABLE.test(entry.name)) continue

        try {
            state.found.push({ path: full, size: fs.statSync(full).size })
        } catch {
            // Vanished between readdir and stat — skip it.
        }
    }
}

/** Every .exe/.bat under a prefix's C: drive. Empty if the prefix isn't there yet. */
export function scanPrefixExecutables(prefixPath: string): ExecutableCandidate[] {
    const root = driveC(prefixPath)
    if (!fs.existsSync(root)) return []

    const state: WalkState = { found: [], visited: 0 }
    walk(root, 0, state)
    return state.found
}

/** Whether the folder exists and already holds something. */
export function inspectPrefix(prefixPath: string): { exists: boolean; hasFiles: boolean } {
    try {
        const entries = fs.readdirSync(prefixPath)
        return { exists: true, hasFiles: entries.length > 0 }
    } catch {
        return { exists: false, hasFiles: false }
    }
}
