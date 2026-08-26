import { describe, it, expect } from 'vitest'
import { dedupeProtonBuilds, isOnPath } from './detect-launch-tools'

// The fs-walking half of this module is exercised by the app itself; what is
// worth pinning is the dedupe, because ~/.steam/root is a symlink into
// ~/.local/share/Steam on most installs and the same build is therefore found
// twice under two different paths.

describe('dedupeProtonBuilds', () => {
    it('collapses the same build found under two search dirs', () => {
        const result = dedupeProtonBuilds([
            { name: 'GE-Proton11-5', path: '/home/u/.local/share/Steam/compatibilitytools.d/GE-Proton11-5' },
            { name: 'GE-Proton11-5', path: '/home/u/.steam/root/compatibilitytools.d/GE-Proton11-5' },
        ])
        expect(result).toHaveLength(1)
    })

    it('keeps the first path seen, so search order decides the winner', () => {
        const result = dedupeProtonBuilds([
            { name: 'GE-Proton11-5', path: '/first' },
            { name: 'GE-Proton11-5', path: '/second' },
        ])
        expect(result[0]?.path).toBe('/first')
    })

    // Numeric collation, so GE-Proton10 does not sort above GE-Proton9.
    it('orders builds naturally rather than lexically', () => {
        const result = dedupeProtonBuilds([
            { name: 'GE-Proton9-1', path: '/a' },
            { name: 'GE-Proton11-5', path: '/b' },
            { name: 'GE-Proton10-2', path: '/c' },
        ])
        expect(result.map((b) => b.name)).toEqual(['GE-Proton9-1', 'GE-Proton10-2', 'GE-Proton11-5'])
    })

    it('returns [] for no builds', () => {
        expect(dedupeProtonBuilds([])).toEqual([])
    })
})

describe('isOnPath', () => {
    it('finds a binary every Linux box has', () => {
        expect(isOnPath('sh')).toBe(true)
    })

    it('does not invent one that is absent', () => {
        expect(isOnPath('gateway-definitely-not-a-real-binary')).toBe(false)
    })
})
