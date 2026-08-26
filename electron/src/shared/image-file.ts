import fs from 'node:fs'

// ═══════════════════════════════════════════════════════════
// Image validation
// ═══════════════════════════════════════════════════════════
//
// Steam's CDN answers a missing asset with a 146-byte HTML 404 page. Saved
// under a .jpg name it looks like a perfectly good cover to existsSync(), so
// the game renders a broken-image icon forever and nothing ever retries.
// Trust magic bytes, not file extensions.

const SIGNATURES: number[][] = [
    [0xff, 0xd8, 0xff],             // JPEG
    [0x89, 0x50, 0x4e, 0x47],       // PNG
    [0x47, 0x49, 0x46, 0x38],       // GIF
    [0x42, 0x4d],                   // BMP
]

/** WEBP is RIFF....WEBP — a signature split across two offsets. */
function isWebp(buffer: Buffer): boolean {
    return (
        buffer.length >= 12 &&
        buffer.toString('ascii', 0, 4) === 'RIFF' &&
        buffer.toString('ascii', 8, 12) === 'WEBP'
    )
}

export function isImageBuffer(buffer: Buffer): boolean {
    if (buffer.length < 4) return false
    if (isWebp(buffer)) return true
    return SIGNATURES.some((signature) =>
        signature.every((byte, index) => buffer[index] === byte)
    )
}

/** True only if the path holds a file that really is an image. */
export function isValidImageFile(filePath: string): boolean {
    try {
        if (!fs.existsSync(filePath)) return false
        const handle = fs.openSync(filePath, 'r')
        try {
            const header = Buffer.alloc(12)
            const bytesRead = fs.readSync(handle, header, 0, 12, 0)
            return isImageBuffer(header.subarray(0, bytesRead))
        } finally {
            fs.closeSync(handle)
        }
    } catch {
        return false
    }
}

// ═══════════════════════════════════════════════════════════
// Dimensions
// ═══════════════════════════════════════════════════════════
//
// Not decoration: a cover slot is 3:4, and Steam will happily hand back a
// 460x215 header.jpg for any app that has no library art. Stored as the cover
// it wins over every other source in the render chain, so the grid shows a
// stretched banner forever with no way to recover. Reading the size is the
// only way to tell the two apart — both are valid JPEGs.

export interface ImageSize {
    width: number
    height: number
}

/** SOF markers carry the frame size. SOF4/8/12 are not frame headers. */
const JPEG_SOF_MARKERS = new Set([
    0xc0, 0xc1, 0xc2, 0xc3, 0xc5, 0xc6, 0xc7,
    0xc9, 0xca, 0xcb, 0xcd, 0xce, 0xcf,
])

function jpegSize(buffer: Buffer): ImageSize | null {
    let offset = 2 // skip SOI
    while (offset + 9 < buffer.length) {
        if (buffer[offset] !== 0xff) { offset++; continue }

        const marker = buffer[offset + 1]!
        // Standalone markers carry no length field.
        if (marker === 0xd8 || marker === 0xd9 || (marker >= 0xd0 && marker <= 0xd7)) {
            offset += 2
            continue
        }
        if (JPEG_SOF_MARKERS.has(marker)) {
            return { height: buffer.readUInt16BE(offset + 5), width: buffer.readUInt16BE(offset + 7) }
        }

        const length = buffer.readUInt16BE(offset + 2)
        if (length < 2) return null // malformed; bail rather than loop forever
        offset += 2 + length
    }
    return null
}

function pngSize(buffer: Buffer): ImageSize | null {
    // IHDR is always the first chunk: 8-byte signature, 4 length, 4 type.
    if (buffer.length < 24 || buffer.toString('ascii', 12, 16) !== 'IHDR') return null
    return { width: buffer.readUInt32BE(16), height: buffer.readUInt32BE(20) }
}

/** Pixel dimensions of a JPEG or PNG, or null for anything else. */
export function readImageSize(buffer: Buffer): ImageSize | null {
    try {
        if (buffer.length >= 24 && buffer[0] === 0x89 && buffer[1] === 0x50) return pngSize(buffer)
        if (buffer.length >= 4 && buffer[0] === 0xff && buffer[1] === 0xd8) return jpegSize(buffer)
        return null
    } catch {
        return null
    }
}

// Every real Steam library cover is taller than it is wide (600x900, 1200x1600,
// 1280x1440, 860x1148 all appear in the wild). Every wrong one is a banner:
// header.jpg 460x215, capsule_image 231x87, library_hero 2560x1440. A slack
// cutoff above 1 keeps near-square custom art usable without letting a banner
// through.
const MAX_COVER_ASPECT = 1.2

/**
 * Whether an image is shaped like a cover rather than a banner.
 *
 * Unreadable dimensions return true: the format is something we can't measure
 * (a user's own WEBP, say), and refusing art we simply failed to parse would
 * be worse than occasionally letting an odd one through.
 */
export function isCoverShaped(buffer: Buffer): boolean {
    const size = readImageSize(buffer)
    if (!size || size.width <= 0 || size.height <= 0) return true
    return size.width / size.height <= MAX_COVER_ASPECT
}

/** Same check against a file already on disk. Reads only the header. */
export function isCoverShapedFile(filePath: string): boolean {
    try {
        const handle = fs.openSync(filePath, 'r')
        try {
            // Enough for PNG IHDR and to walk a JPEG's leading segments.
            const header = Buffer.alloc(65536)
            const bytesRead = fs.readSync(handle, header, 0, header.length, 0)
            return isCoverShaped(header.subarray(0, bytesRead))
        } finally {
            fs.closeSync(handle)
        }
    } catch {
        return true
    }
}
