import { describe, expect, it } from 'vitest'
import { canResetPrefix } from './can-reset-prefix'

const home = '/home/emppu'
const check = (prefixPath: string) => canResetPrefix({ prefixPath, homeDir: home })

describe('canResetPrefix', () => {
    it('allows a prefix where Gateway puts them', () => {
        expect(check('/home/emppu/Games/Gateway/prefixes/silksong')).toBe(true)
    })

    it('allows a prefix on a mounted games drive', () => {
        expect(check('/mnt/games/prefixes/bg3')).toBe(true)
        expect(check('/run/media/emppu/SSD/prefixes/bg3')).toBe(true)
    })

    it('refuses the filesystem root and the home directory', () => {
        expect(check('/')).toBe(false)
        expect(check('/home/emppu')).toBe(false)
        expect(check('/home/emppu/')).toBe(false)
    })

    it('refuses a bare allowed root or one level under it', () => {
        expect(check('/mnt')).toBe(false)
        expect(check('/mnt/games')).toBe(false)
        expect(check('/home/emppu/Games')).toBe(false)
    })

    it('refuses system locations outside the allowed roots', () => {
        expect(check('/etc/passwd')).toBe(false)
        expect(check('/usr/share/steam/compatibilitytools.d/x')).toBe(false)
        expect(check('/home/someoneelse/Games/prefixes/x')).toBe(false)
    })

    it('refuses relative paths and traversal', () => {
        expect(check('Games/prefixes/x')).toBe(false)
        expect(check('/home/emppu/Games/../../../etc')).toBe(false)
    })

    it('refuses an empty path', () => {
        expect(check('')).toBe(false)
    })
})
