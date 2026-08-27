import path from 'node:path'
import fs from 'node:fs'
import { app, BrowserWindow } from 'electron'
import { Game } from './types'
import { JsonStore } from './store'
import { generateMissingThumbnails } from './cover-thumbnails'
import { isImageBuffer, isValidImageFile, isCoverShaped, isCoverShapedFile } from './image-file'
import { steamCoverGuesses, steamHeroGuesses, steamLogoGuesses, fetchSteamArtUrls } from './steam-art-urls'

/**
 * Fetch a URL only if it yields a real image. Steam answers missing art with
 * a 146-byte HTML 404 body, which must never be written under a .jpg name.
 */
const IMAGE_FETCH_TIMEOUT_MS = 15_000

async function fetchImage(url: string, requireCoverShape = false): Promise<Buffer | null> {
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
        // Steam substitutes a 460x215 header.jpg whenever an app has no
        // library art. It is a perfectly valid image and completely wrong for
        // a 3:4 cover slot, so the shape is the only thing that can reject it.
        if (requireCoverShape && !isCoverShaped(buffer)) {
            console.log(`[Art] Rejecting ${url} — banner-shaped, not a cover`)
            return null
        }
        return buffer
    } catch {
        return null
    }
}

/**
 * The appid to pull ART from. Same rule as the renderer's getMetadataAppId:
 * `steamAppId` means the user owns it, `metadataAppId` means it was matched to
 * a Steam entry for its data. Art works for either — and a manually added game
 * matched to a Steam entry only ever has the second one, which is why it used
 * to end up with no cover at all.
 */
export function artAppId(game: Game): string | undefined {
    return game.steamAppId ?? game.metadataAppId
}

/**
 * True when the art on this game came from the user or from Steam's own grid
 * cache rather than being derived from an appid. Re-matching must not clobber
 * art someone deliberately chose.
 */
function isUserProvidedArt(game: Game): boolean {
    return Boolean(
        game.coverUrl?.startsWith('file://')
        || game.localCoverPath?.startsWith('shortcut_')
        || game.heroImageUrl?.includes('/shortcut_')
    )
}

export async function downloadGameCover(game: Game): Promise<string | null> {
    // file:// covers (e.g. non-Steam shortcut art read straight from Steam's own
    // grid cache) are already local — nothing to mirror, and Node's fetch()
    // doesn't support the file: scheme anyway.
    if (game.coverUrl?.startsWith('file://')) return game.localCoverPath || null

    try {
        const coversDir = path.join(app.getPath('userData'), 'assets', 'covers')
        if (!fs.existsSync(coversDir)) fs.mkdirSync(coversDir, { recursive: true })

        const fileName = `${artAppId(game) || game.id}.jpg`
        const filePath = path.join(coversDir, fileName)

        // Only trust an existing file if it is genuinely an image AND is
        // shaped like a cover — a stored 404 page, or a banner mirrored before
        // the shape check existed, would otherwise be trusted forever.
        if (isValidImageFile(filePath) && isCoverShapedFile(filePath)) return fileName
        if (fs.existsSync(filePath)) {
            console.warn(`[Art] Replacing invalid mirrored cover for ${game.title}`)
            fs.rmSync(filePath, { force: true })
        }

        // Whatever we were told, then the guessable CDN paths. Many apps
        // (multiplayer components, newer hashed-asset titles) have no
        // library_600x900 art at all, so a single URL is not enough.
        const candidates = [
            ...(game.coverUrl ? [game.coverUrl] : []),
            ...(artAppId(game) ? steamCoverGuesses(artAppId(game)!) : []),
        ]

        for (const url of candidates) {
            const buffer = await fetchImage(url, true)
            if (buffer) {
                fs.writeFileSync(filePath, buffer)
                return fileName
            }
        }

        // Last resort: only the appdetails API knows content-hashed asset paths.
        const appId = artAppId(game)
        if (appId) {
            for (const url of await fetchSteamArtUrls(appId)) {
                const buffer = await fetchImage(url, true)
                if (buffer) {
                    fs.writeFileSync(filePath, buffer)
                    console.log(`[Art] Recovered cover for ${game.title} via appdetails`)
                    return fileName
                }
            }
        }

        // Not a failure to report loudly: some apps genuinely have no
        // portrait art anywhere on Steam. The card's no-cover state handles it.
        console.log(`[Art] No portrait cover available for ${game.title} (${artAppId(game) ?? game.id})`)
        return null
    } catch (error) {
        console.error(`Failed to download cover for ${game.title}:`, error)
        return null
    }
}

/**
 * Mirror the first URL that yields a real image into assets/<subDir>.
 * Returns the stored file name, or null if nothing resolved.
 */
async function mirrorRemoteArt(
    urls: string[],
    subDir: 'heroes' | 'logos',
    baseName: string,
    ext: string
): Promise<string | null> {
    const dir = path.join(app.getPath('userData'), 'assets', subDir)
    if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })

    const fileName = `${baseName}${ext}`
    const filePath = path.join(dir, fileName)
    if (isValidImageFile(filePath)) return fileName
    if (fs.existsSync(filePath)) fs.rmSync(filePath, { force: true })

    for (const url of urls) {
        const buffer = await fetchImage(url)
        if (buffer) {
            fs.writeFileSync(filePath, buffer)
            return fileName
        }
    }
    return null
}

/**
 * Every piece of art the app uses for one game — grid cover, banner hero, and
 * title logo — mirrored locally and returned as a patch.
 *
 * This is the on-demand counterpart to mirrorAllCovers: that pass runs over
 * the whole library and only does covers, which left a freshly Steam-matched
 * game with no art until the next full sync, and never any hero or logo.
 *
 * Art the user (or Steam's own grid cache) provided is left alone.
 */
export async function downloadGameArt(game: Game, force = false): Promise<Partial<Game>> {
    const appId = artAppId(game)
    if (!appId) return {}
    // Matching a game is a request for metadata, not a request to replace art
    // someone chose — so that path leaves user art alone. Pressing "Get
    // artwork from Steam" is a request for art, and forces it.
    if (!force && isUserProvidedArt(game)) {
        console.log(`[Art] Keeping user-provided art for ${game.title}`)
        return {}
    }

    const patch: Partial<Game> = {}

    const cover = await downloadGameCover({ ...game, localCoverPath: undefined })
    if (cover) patch.localCoverPath = cover

    const hero = await mirrorRemoteArt(steamHeroGuesses(appId), 'heroes', appId, '.jpg')
    if (hero) patch.heroImageUrl = `gateway://hero/${hero}`

    const logo = await mirrorRemoteArt(steamLogoGuesses(appId), 'logos', appId, '.png')
    if (logo) patch.logoImageUrl = `gateway://logo/${logo}`

    console.log(
        `[Art] ${game.title} (${appId}): cover ${cover ? 'ok' : 'none'}, ` +
        `hero ${hero ? 'ok' : 'none'}, logo ${logo ? 'ok' : 'none'}`
    )
    return patch
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
        // Two kinds of broken: a stored 404 page, and a banner mirrored into
        // the cover slot before the shape check existed. Both render wrong
        // forever, and both are skipped by the "already has a cover" test
        // below unless they count as stale.
        const coverPath = game.localCoverPath ? path.join(coversDir, game.localCoverPath) : null
        const stale = Boolean(
            coverPath && (!isValidImageFile(coverPath) || !isCoverShapedFile(coverPath))
        )
        if (stale) repaired++

        if (game.localCoverPath && !stale) continue
        if (!game.coverUrl && !artAppId(game)) continue

        const fileName = await downloadGameCover(
            stale ? { ...game, localCoverPath: undefined } : game
        )
        if (fileName) mirrored.set(game.id, fileName)
        else if (stale) mirrored.set(game.id, '')
    }

    if (mirrored.size === 0) {
        await generateMissingThumbnails(store)
        return
    }

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

    // After the store update, so freshly mirrored covers are included.
    await generateMissingThumbnails(store)
}
