import { describe, it, expect } from 'vitest'
import { isImageBuffer } from './image-file'

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
