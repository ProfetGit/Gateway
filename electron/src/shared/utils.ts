import path from 'node:path'
import fs from 'node:fs'
import { app, BrowserWindow } from 'electron'
import { Game } from './types'
import { JsonStore } from './store'

export async function downloadGameCover(game: Game): Promise<string | null> {
    // file:// covers (e.g. non-Steam shortcut art read straight from Steam's own
    // grid cache) are already local — nothing to mirror, and Node's fetch()
    // doesn't support the file: scheme anyway.
    if (!game.coverUrl || game.localCoverPath || game.coverUrl.startsWith('file://')) {
        return game.localCoverPath || null
    }

    try {
        const userDataPath = app.getPath('userData')
        const coversDir = path.join(userDataPath, 'assets', 'covers')

        if (!fs.existsSync(coversDir)) {
            fs.mkdirSync(coversDir, { recursive: true })
        }

        const fileName = `${game.steamAppId || game.id}.jpg`
        const filePath = path.join(coversDir, fileName)

        // Skip if already exists
        if (fs.existsSync(filePath)) {
            return fileName
        }

        const response = await fetch(game.coverUrl)
        if (!response.ok) return null

        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        fs.writeFileSync(filePath, buffer)

        return fileName
    } catch (error) {
        console.error(`Failed to download cover for ${game.title}:`, error)
        return null
    }
}

/**
 * Copies a locally-available art file (e.g. from Steam's own shortcut grid
 * cache) into Gateway's own assets/<subDir>, so it can be served through the
 * gateway:// protocol like any other mirrored image. Unlike downloadGameCover
 * there's no network fetch — the source file already exists on disk.
 */
export function mirrorLocalArt(sourcePath: string, subDir: 'covers' | 'heroes' | 'logos', baseName: string): string | null {
    try {
        if (!fs.existsSync(sourcePath)) return null

        const destDir = path.join(app.getPath('userData'), 'assets', subDir)
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true })
        }

        const ext = path.extname(sourcePath) || '.png'
        const fileName = `${baseName}${ext}`
        const destPath = path.join(destDir, fileName)

        if (!fs.existsSync(destPath)) {
            fs.copyFileSync(sourcePath, destPath)
        }

        return fileName
    } catch (error) {
        console.error(`Failed to mirror local art from ${sourcePath}:`, error)
        return null
    }
}

export async function mirrorAllCovers(store: JsonStore, win: BrowserWindow | null) {
    console.log('[Main] Mirroring covers in background...')

    // Downloading a few hundred covers takes minutes, and other syncs write to
    // the library the whole time. So collect results keyed by game id and
    // apply them to a FRESH read at the end — writing the snapshot taken here
    // back at line-end would erase everything imported in between.
    const mirrored = new Map<string, string>()

    for (const game of store.get('games')) {
        if (!game.coverUrl || game.localCoverPath) continue
        const fileName = await downloadGameCover(game)
        if (fileName) mirrored.set(game.id, fileName)
    }

    if (mirrored.size === 0) return

    const next = store.updateGames((games) =>
        games.map((game) => {
            const fileName = mirrored.get(game.id)
            // Skip if the row already gained a cover, or was replaced/removed,
            // while we were downloading.
            return fileName && !game.localCoverPath ? { ...game, localCoverPath: fileName } : game
        })
    )

    console.log(`[Main] ✓ Mirroring complete, ${mirrored.size} cover(s) stored`)
    win?.webContents.send('games-updated', next)
}
