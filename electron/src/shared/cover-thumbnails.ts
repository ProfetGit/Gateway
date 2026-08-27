import fs from 'node:fs'
import path from 'node:path'
import { app, nativeImage } from 'electron'
import { JsonStore } from './store'

// ═══════════════════════════════════════════════════════════
// Grid-sized cover thumbnails
// ═══════════════════════════════════════════════════════════
//
// Mirrored covers are stored at source resolution — 600x900, and on a real
// library that is 246 MB across 457 files, a quarter of them over 1 MB. The
// grid draws them at roughly 205x274. Every one of those is decoded to a full
// 600x900x4 bitmap to fill a slot a ninth of the area: 50 cards mounted during
// a scroll measured 243 MB of decoded pixels, and the renderer's RSS went from
// 234 MB to 452 MB on one pass through the library.
//
// The disk cache was never the problem — this is. So keep the original (the
// detail view and HiDPI displays want it) and mirror a grid-sized copy beside
// it.

/** Wide enough for the largest grid preset (280px min-width, stretching to
 *  ~350px) at 1x. The renderer asks for the original above 1.5x DPR. */
const THUMB_WIDTH = 450
const THUMB_QUALITY = 82

function dir(name: 'covers' | 'thumbs'): string {
    return path.join(app.getPath('userData'), 'assets', name)
}

/** The thumbnail for a mirrored cover, or null if there isn't one yet. */
export function thumbnailPath(fileName: string): string | null {
    const filePath = path.join(dir('thumbs'), fileName)
    return fs.existsSync(filePath) ? filePath : null
}

/**
 * Write a downscaled copy of one mirrored cover. Returns false when the source
 * is unreadable or already small enough to not be worth a second file.
 */
export function generateThumbnail(fileName: string): boolean {
    const source = path.join(dir('covers'), fileName)
    if (!fs.existsSync(source)) return false

    try {
        const image = nativeImage.createFromPath(source)
        if (image.isEmpty()) return false

        const { width } = image.getSize()
        if (width <= THUMB_WIDTH) return false

        const thumbsDir = dir('thumbs')
        if (!fs.existsSync(thumbsDir)) fs.mkdirSync(thumbsDir, { recursive: true })

        // Always JPEG, whatever the source was — 60 of the mirrored "covers"
        // are actually PNG bytes under a .jpg name, and re-encoding them as
        // JPEG makes the extension honest for the first time.
        const resized = image.resize({ width: THUMB_WIDTH, quality: 'good' })
        fs.writeFileSync(path.join(thumbsDir, fileName), resized.toJPEG(THUMB_QUALITY))
        return true
    } catch (error) {
        console.warn(`[Art] Couldn't thumbnail ${fileName}:`, (error as Error).message)
        return false
    }
}

/**
 * Fill in thumbnails for every cover the library points at that lacks one.
 *
 * Runs after the cover mirror, and is cheap on every launch after the first:
 * the work is one `existsSync` per game until a new cover appears. Yields to
 * the event loop periodically so a first run over a few hundred covers doesn't
 * hold the main process hostage.
 */
export async function generateMissingThumbnails(store: JsonStore): Promise<void> {
    const thumbs = dir('thumbs')
    let made = 0

    for (const game of store.get('games')) {
        const fileName = game.localCoverPath
        if (!fileName) continue
        if (fs.existsSync(path.join(thumbs, fileName))) continue

        if (generateThumbnail(fileName)) made++
        if (made % 20 === 0) await new Promise((resolve) => setImmediate(resolve))
    }

    if (made > 0) console.log(`[Art] ✓ ${made} cover thumbnail(s) generated`)
}
