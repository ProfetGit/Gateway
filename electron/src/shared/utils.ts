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
    const games = store.get('games')
    let updated = false

    for (const game of games) {
        if (game.coverUrl && !game.localCoverPath) {
            const fileName = await downloadGameCover(game)
            if (fileName) {
                game.localCoverPath = fileName
                updated = true
            }
        }
    }

    if (updated) {
        store.set('games', games)
        console.log('[Main] ✓ Mirroring complete, store updated')
        win?.webContents.send('games-updated', games)
    }
}
