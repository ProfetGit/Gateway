import { describe, it, expect } from 'vitest'
import { isImageBuffer, readImageSize, isCoverShaped } from './image-file'

// The exact body Steam's CDN serves for a missing asset. Saved as a .jpg it
// passed every existence check and rendered as a broken image forever.
const STEAM_404 = Buffer.from(
    '<html>\r\n<head><title>404 Not Found</title></head>\r\n<body>\r\n' +
    '<center><h1>404 Not Found</h1></center>\r\n<hr><center>nginx</center>\r\n</body>\r\n</html>\r\n'
)

describe('isImageBuffer', () => {
    it('rejects the Steam CDN 404 page', () => {
        expect(isImageBuffer(STEAM_404)).toBe(false)
        // Pin the size too — this is the file found on disk.
        expect(STEAM_404.length).toBe(146)
    })

    it.each([
        ['JPEG', [0xff, 0xd8, 0xff, 0xe0]],
        ['PNG', [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a]],
        ['GIF', [0x47, 0x49, 0x46, 0x38, 0x39, 0x61]],
        ['BMP', [0x42, 0x4d, 0x00, 0x00]],
    ])('accepts %s', (_name, bytes) => {
        expect(isImageBuffer(Buffer.from(bytes))).toBe(true)
    })

    it('accepts WEBP, whose signature is split across two offsets', () => {
        const webp = Buffer.concat([
            Buffer.from('RIFF', 'ascii'),
            Buffer.from([0x00, 0x00, 0x00, 0x00]),
            Buffer.from('WEBP', 'ascii'),
        ])
        expect(isImageBuffer(webp)).toBe(true)
    })

    it('rejects RIFF that is not WEBP (e.g. a WAV)', () => {
        const wav = Buffer.concat([
            Buffer.from('RIFF', 'ascii'),
            Buffer.from([0x00, 0x00, 0x00, 0x00]),
            Buffer.from('WAVE', 'ascii'),
        ])
        expect(isImageBuffer(wav)).toBe(false)
    })

    it.each([
        ['empty', Buffer.alloc(0)],
        ['too short to identify', Buffer.from([0xff, 0xd8])],
        ['plain text', Buffer.from('not an image at all')],
        ['JSON error body', Buffer.from('{"success":false}')],
    ])('rejects %s', (_name, buffer) => {
        expect(isImageBuffer(buffer)).toBe(false)
    })

    it('rejects a buffer whose image signature is not at the start', () => {
        const shifted = Buffer.concat([Buffer.from('XX'), Buffer.from([0xff, 0xd8, 0xff])])
        expect(isImageBuffer(shifted)).toBe(false)
    })
})

// ═══════════════════════════════════════════════════════════
// Cover shape
// ═══════════════════════════════════════════════════════════
//
// The reported bug: "covers do exist but the app shows the hero and not the
// cover". Steam substitutes a 460x215 header.jpg whenever an app has no
// library art, and it was mirrored straight into the cover slot — where
// localCoverPath outranks every other source, so the grid showed a stretched
// banner permanently. 41 of 458 mirrored covers on a real library were
// landscape, 21 of them exactly header.jpg size.

/** Minimal but real JPEG: SOI, a JFIF APP0, then an SOF0 carrying the size. */
function jpeg(width: number, height: number): Buffer {
    const sof = Buffer.alloc(11)
    sof.writeUInt16BE(0xffc0, 0)
    sof.writeUInt16BE(8 + 3, 2) // segment length, one component
    sof.writeUInt8(8, 4)        // precision
    sof.writeUInt16BE(height, 5)
    sof.writeUInt16BE(width, 7)
    sof.writeUInt8(1, 9)
    return Buffer.concat([
        Buffer.from([0xff, 0xd8]),
        Buffer.from([0xff, 0xe0, 0x00, 0x04, 0x00, 0x00]), // APP0, skipped
        sof,
    ])
}

function png(width: number, height: number): Buffer {
    const buffer = Buffer.alloc(24)
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]).copy(buffer, 0)
    buffer.writeUInt32BE(13, 8)
    buffer.write('IHDR', 12, 'ascii')
    buffer.writeUInt32BE(width, 16)
    buffer.writeUInt32BE(height, 20)
    return buffer
}

describe('readImageSize', () => {
    it('reads a JPEG past a leading segment it must skip', () => {
        expect(readImageSize(jpeg(600, 900))).toEqual({ width: 600, height: 900 })
    })

    it('reads a PNG from its IHDR', () => {
        expect(readImageSize(png(640, 480))).toEqual({ width: 640, height: 480 })
    })

    it.each([
        ['the Steam 404 page', Buffer.from('<html><head><title>404', 'utf8')],
        ['an empty buffer', Buffer.alloc(0)],
        ['a truncated JPEG', Buffer.from([0xff, 0xd8, 0xff])],
    ] as const)('returns null for %s', (_label, buffer) => {
        expect(readImageSize(buffer)).toBeNull()
    })

    // A malformed length field used to be an infinite loop over the segments.
    it('bails on a zero-length segment instead of looping', () => {
        const bad = Buffer.concat([Buffer.from([0xff, 0xd8]), Buffer.from([0xff, 0xe0, 0x00, 0x00]), Buffer.alloc(64)])
        expect(readImageSize(bad)).toBeNull()
    })
})

describe('isCoverShaped', () => {
    it.each([
        ['600x900, the standard library capsule', 600, 900],
        ['1200x1600', 1200, 1600],
        ['1280x1440', 1280, 1440],
        ['860x1148', 860, 1148],
    ] as const)('accepts %s', (_label, w, h) => {
        expect(isCoverShaped(jpeg(w, h))).toBe(true)
    })

    it.each([
        ['460x215, header.jpg — 21 real covers were this', 460, 215],
        ['231x87, the appdetails capsule', 231, 87],
        ['2560x1440, library_hero', 2560, 1440],
    ] as const)('rejects %s', (_label, w, h) => {
        expect(isCoverShaped(jpeg(w, h))).toBe(false)
    })

    it('allows slightly-wide custom art through', () => {
        expect(isCoverShaped(jpeg(1100, 1000))).toBe(true)
    })

    // Refusing art we merely failed to measure would be worse than letting an
    // odd one through — a user's own WEBP cover has no reader here.
    it('accepts an image whose dimensions cannot be read', () => {
        const webp = Buffer.concat([Buffer.from('RIFF'), Buffer.alloc(4), Buffer.from('WEBP')])
        expect(isCoverShaped(webp)).toBe(true)
    })
})
