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
