import path from 'node:path'
import fs from 'node:fs'
import { app } from 'electron'
import { Game } from './types'

export async function downloadGameCover(game: Game): Promise<string | null> {
    if (!game.coverUrl || game.localCoverPath) return game.localCoverPath || null

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
        const arrayBuffer = await response.arrayBuffer()
        const buffer = Buffer.from(arrayBuffer)
        fs.writeFileSync(filePath, buffer)

        return fileName
    } catch (error) {
        console.error(`Failed to download cover for ${game.title}:`, error)
        return null
    }
}

import { JsonStore } from './store'
import { BrowserWindow } from 'electron'

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
        // Notify renderer if window is open
        win?.webContents.send('games-updated', games)
    }
}
