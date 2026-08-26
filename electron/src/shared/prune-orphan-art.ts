import fs from 'node:fs'
import path from 'node:path'
import { app } from 'electron'
import { JsonStore } from './store'
import type { Game } from './types'

// ═══════════════════════════════════════════════════════════
// Orphaned art cleanup
// ═══════════════════════════════════════════════════════════
//
// Mirrored art is never deleted when its game leaves the library, so every
// clear-and-resync and every removed source leaves its files behind forever.
// On a real library this had grown to 586 unreferenced files.

const ART_DIRS = ['covers', 'heroes', 'logos'] as const

/** Every art filename the library still points at, in any of its art fields. */
function referencedFileNames(games: Game[]): Set<string> {
    const referenced = new Set<string>()

    for (const game of games) {
        if (game.localCoverPath) referenced.add(game.localCoverPath)
        // Hero and logo are stored as gateway://<type>/<file> URLs.
        for (const url of [game.heroImageUrl, game.logoImageUrl]) {
            if (url?.startsWith('gateway://')) {
                const fileName = url.split('/').pop()
                if (fileName) referenced.add(fileName)
            }
        }
    }

    return referenced
}

/**
 * Delete mirrored art no game refers to any more. Safe to run at any time:
 * anything still needed gets re-downloaded by the normal cover pass.
 */
export function pruneOrphanArt(store: JsonStore): number {
    const referenced = referencedFileNames(store.get('games'))
    const assetsRoot = path.join(app.getPath('userData'), 'assets')
    let removed = 0

    for (const dir of ART_DIRS) {
        const dirPath = path.join(assetsRoot, dir)
        if (!fs.existsSync(dirPath)) continue

        for (const fileName of fs.readdirSync(dirPath)) {
            if (referenced.has(fileName)) continue
            try {
                fs.rmSync(path.join(dirPath, fileName), { force: true })
                removed++
            } catch (error) {
                console.warn(`[Art] Could not remove orphaned ${dir}/${fileName}:`, error)
            }
        }
    }

    if (removed > 0) console.log(`[Art] Removed ${removed} orphaned art file(s)`)
    return removed
}
