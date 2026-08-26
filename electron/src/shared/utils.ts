import path from 'node:path'
import fs from 'node:fs'
import { app, BrowserWindow } from 'electron'
import { Game } from './types'
import { JsonStore } from './store'
import { isImageBuffer, isValidImageFile } from './image-file'
import { steamCoverGuesses, fetchSteamArtUrls } from './steam-art-urls'

/**
 * Fetch a URL only if it yields a real image. Steam answers missing art with
 * a 146-byte HTML 404 body, which must never be written under a .jpg name.
 */
const IMAGE_FETCH_TIMEOUT_MS = 15_000

async function fetchImage(url: string): Promise<Buffer | null> {
    try {
        // Without a timeout one stalled connection blocks the whole cover pass
        // — it is a sequential loop over the entire library.
        const response = await fetch(url, {
            signal: AbortSignal.timeout(IMAGE_FETCH_TIMEOUT_MS),
        })
        if (!response.ok) return null

        const buffer = Buffer.from(await response.arrayBuffer())
        if (!isImageBuffer(buffer)) {
            console.warn(`[Art] ${url} returned ${buffer.length} bytes that are not an image`)
            return null
        }
        return buffer
    } catch {
        return null
    }
}

export async function downloadGameCover(game: Game): Promise<string | null> {
    // file:// covers (e.g. non-Steam shortcut art read straight from Steam's own
    // grid cache) are already local — nothing to mirror, and Node's fetch()
    // doesn't support the file: scheme anyway.
    if (game.coverUrl?.startsWith('file://')) return game.localCoverPath || null

    try {
        const coversDir = path.join(app.getPath('userData'), 'assets', 'covers')
        if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true })

        const fileName = `${game.steamAppId || game.id}.jpg`
        const filePath = path.join(coversDir, fileName)

        // Only trust an existing file if it is genuinely an image — a stored
        // 404 page would otherwise be trusted forever and never retried.
        if (isValidImageFile(filePath)) return fileName
        if (fs.existsSync(filePath)) {
            console.warn(`[Art] Replacing invalid mirrored cover for ${game.title}`)
            fs.rmSync(filePath, { force: true })
        }

        // Whatever we were told, then the guessable CDN paths. Many apps
        // (multiplayer components, newer hashed-asset titles) have no
        // library_600x900 art at all, so a single URL is not enough.
        const candidates = [
            ...(game.coverUrl ? [game.coverUrl] : []),
            ...(game.steamAppId ? steamCoverGuesses(game.steamAppId) : []),
        ]

        for (const url of candidates) {
            const buffer = await fetchImage(url)
            if (buffer) {
                fs.writeFileSync(filePath, buffer)
                return fileName
            }
        }

        // Last resort: only the appdetails API knows content-hashed asset paths.
        if (game.steamAppId) {
            for (const url of await fetchSteamArtUrls(game.steamAppId)) {
                const buffer = await fetchImage(url)
                if (buffer) {
                    fs.writeFileSync(filePath, buffer)
                    console.log(`[Art] Recovered cover for ${game.title} via appdetails`)
                    return fileName
                }
            }
        }

        console.warn(`[Art] No usable cover found for ${game.title} (${game.steamAppId ?? game.id})`)
        return null
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
    const coversDir = path.join(app.getPath('userData'), 'assets', 'covers')
    let repaired = 0

    for (const game of store.get('games')) {
        // A localCoverPath pointing at a stored 404 page renders as a broken
        // image forever, and the "already has a cover" check below would skip
        // it every time. Treat an unreadable file as no cover at all.
        const stale =
            game.localCoverPath && !isValidImageFile(path.join(coversDir, game.localCoverPath))
        if (stale) repaired++

        if (game.localCoverPath && !stale) continue
        if (!game.coverUrl && !game.steamAppId) continue

        const fileName = await downloadGameCover(
            stale ? { ...game, localCoverPath: undefined } : game
        )
        if (fileName) mirrored.set(game.id, fileName)
        else if (stale) mirrored.set(game.id, '')
    }

    if (mirrored.size === 0) return

    const next = store.updateGames((games) =>
        games.map((game) => {
            const fileName = mirrored.get(game.id)
            if (fileName === undefined) return game
            // '' means the old value was broken and nothing replaced it — drop
            // it so the renderer falls back to its remote-URL chain.
            if (fileName === '') return { ...game, localCoverPath: undefined }
            return { ...game, localCoverPath: fileName }
        })
    )

    console.log(
        `[Main] ✓ Mirroring complete, ${mirrored.size} cover(s) stored` +
        (repaired > 0 ? ` (${repaired} broken cover(s) repaired)` : '')
    )
    win?.webContents.send('games-updated', next)
}
