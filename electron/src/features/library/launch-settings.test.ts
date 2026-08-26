import { describe, it, expect } from 'vitest'
import { prefixSlug, prefixPathFor, readLaunchSettings, defaultPrefixRoot } from './launch-settings'

// The slug becomes a real directory name holding a multi-gigabyte prefix, so
// the cases that matter are the ones that would otherwise produce a path the
// user cannot type, or an empty one.

describe('prefixSlug', () => {
    it.each([
        ['Hades', 'hades'],
        ['The Witcher 3: Wild Hunt', 'the-witcher-3-wild-hunt'],
        ['Baldur&#39;s Gate II', 'baldur-39-s-gate-ii'],
        ['  spaced  out  ', 'spaced-out'],
        ['Pokémon Snäp', 'pokemon-snap'],
        ['S.T.A.L.K.E.R.', 's-t-a-l-k-e-r'],
        ['///', 'game'],
        ['', 'game'],
        ['日本語', 'game'],
    ] as const)('%s -> %s', (title, expected) => {
        expect(prefixSlug(title)).toBe(expected)
    })

    it('caps the length so the path stays usable', () => {
        expect(prefixSlug('a'.repeat(200))).toHaveLength(64)
    })

    it('never emits a leading or trailing dash', () => {
        expect(prefixSlug('!!Doom!!')).toBe('doom')
    })
})

describe('prefixPathFor', () => {
    it('joins the root and the slug', () => {
        expect(prefixPathFor('/home/u/Games/Gateway/prefixes', 'Hades II')).toBe(
            '/home/u/Games/Gateway/prefixes/hades-ii'
        )
    })
})

describe('readLaunchSettings', () => {
    it('fills every default for a store that has never seen these keys', () => {
        expect(readLaunchSettings({})).toEqual({
            prefixRoot: defaultPrefixRoot(),
            defaultProtonPath: undefined,
            defaultUseMangoHud: false,
            defaultUseGameMode: false,
        })
    })

    it('keeps values the user has set', () => {
        expect(readLaunchSettings({ prefixRoot: '/mnt/games/prefixes', defaultUseGameMode: true })).toMatchObject({
            prefixRoot: '/mnt/games/prefixes',
            defaultUseGameMode: true,
        })
    })

    // An empty string is what a cleared text input sends; it must not become
    // the prefix root, or every prefix lands at the filesystem root.
    it('treats an empty prefixRoot as unset', () => {
        expect(readLaunchSettings({ prefixRoot: '' }).prefixRoot).toBe(defaultPrefixRoot())
    })
})
