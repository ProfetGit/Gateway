import { describe, it, expect } from 'vitest'
import { identityKey, restoreUserState, unrebuildableGames } from './preserve-user-state'
import type { Game } from '../../shared/types'

function makeGame(overrides: Partial<Game> = {}): Game {
    return {
        id: Math.random().toString(36).slice(2),
        title: 'Game',
        isInstalled: false,
        isFavorite: false,
        source: 'steam',
        ...overrides,
    }
}

describe('unrebuildableGames', () => {
    // The reported bug: adding a game by hand and pressing Refresh Library
    // deleted it, because nothing scans for manual rows.
    it('keeps a manually added game', () => {
        const manual = makeGame({ source: 'manual', title: 'My GOG game' })
        expect(unrebuildableGames([manual, makeGame({ steamAppId: '1' })])).toEqual([manual])
    })

    it.each(['steam', 'shortcut', 'heroic', 'lutris'] as const)('drops %s rows, which a scanner rebuilds', (source) => {
        expect(unrebuildableGames([makeGame({ source })])).toEqual([])
    })

    it('returns [] for an empty library', () => {
        expect(unrebuildableGames([])).toEqual([])
    })
})

describe('identityKey', () => {
    it.each([
        ['heroic', { heroicAppName: 'Fortnite', heroicRunner: 'legendary' as const }, 'heroic:legendary:Fortnite'],
        ['lutris', { lutrisId: 7 }, 'lutris:7'],
        ['shortcut', { shortcutId: '1234' }, 'shortcut:1234'],
        ['steam', { steamAppId: '1145360' }, 'steam:1145360'],
    ] as const)('keys a %s row', (_label, overrides, expected) => {
        expect(identityKey(makeGame(overrides))).toBe(expected)
    })

    // Same precedence as resolve-launch: a Heroic row may also carry a
    // metadata-only Steam appid, and must not be keyed as a Steam row.
    it('prefers the launcher identity over an attached Steam appid', () => {
        const game = makeGame({ heroicAppName: 'Hades', heroicRunner: 'gog', steamAppId: '1145360' })
        expect(identityKey(game)).toBe('heroic:gog:Hades')
    })

    it('has no key for a manual game', () => {
        expect(identityKey(makeGame({ source: 'manual' }))).toBeUndefined()
    })
})

describe('restoreUserState', () => {
    it('carries favourites onto the rebuilt row', () => {
        const before = [makeGame({ steamAppId: '1', isFavorite: true })]
        const rebuilt = [makeGame({ steamAppId: '1' })]
        expect(restoreUserState(rebuilt, before)[0]?.isFavorite).toBe(true)
    })

    // The unrecoverable one: the only record of achievement progress for a
    // game Steam cannot report on.
    it('carries manualUnlocks', () => {
        const before = [makeGame({ shortcutId: '9', manualUnlocks: { ACH_ONE: 1700000000 } })]
        const rebuilt = [makeGame({ shortcutId: '9' })]
        expect(restoreUserState(rebuilt, before)[0]?.manualUnlocks).toEqual({ ACH_ONE: 1700000000 })
    })

    it.each([
        ['notes', { notes: 'needs dxvk' }],
        ['metadataAppId', { metadataAppId: '1145360' }],
        ['runner', { runner: 'umu' as const }],
        ['protonPath', { protonPath: '/tools/GE-Proton11-5' }],
        ['umuGameId', { umuGameId: 'umu-1145360' }],
        ['useMangoHud', { useMangoHud: true }],
        ['useGameMode', { useGameMode: true }],
        ['launchArgs', { launchArgs: '-windowed' }],
        ['customEnvVars', { customEnvVars: 'DXVK_HUD=fps' }],
    ] as const)('carries %s', (field, overrides) => {
        const before = [makeGame({ shortcutId: '9', ...overrides })]
        const rebuilt = [makeGame({ shortcutId: '9' })]
        expect(restoreUserState(rebuilt, before)[0]?.[field]).toEqual(overrides[field as keyof typeof overrides])
    })

    // The shortcut scanner owns these, so a stale saved value must not win.
    it.each([
        ['executablePath', { executablePath: '/old/path.exe' }],
        ['winePrefix', { winePrefix: '/old/prefix' }],
    ] as const)('does NOT carry %s, which a scanner owns', (field, overrides) => {
        const before = [makeGame({ shortcutId: '9', ...overrides })]
        const rebuilt = [makeGame({ shortcutId: '9', [field]: '/fresh' })]
        expect(restoreUserState(rebuilt, before)[0]?.[field]).toBe('/fresh')
    })

    it('leaves fresh scanned data alone', () => {
        const before = [makeGame({ steamAppId: '1', title: 'Old Name', playtime: 10 })]
        const rebuilt = [makeGame({ steamAppId: '1', title: 'New Name', playtime: 99 })]
        expect(restoreUserState(rebuilt, before)[0]).toMatchObject({ title: 'New Name', playtime: 99 })
    })

    it('leaves a row with no previous match untouched', () => {
        const rebuilt = [makeGame({ steamAppId: '2' })]
        expect(restoreUserState(rebuilt, [makeGame({ steamAppId: '1', isFavorite: true })])).toEqual(rebuilt)
    })

    it('does not resurrect a favourite the user had already unset', () => {
        const before = [makeGame({ steamAppId: '1', isFavorite: false })]
        const rebuilt = [makeGame({ steamAppId: '1', isFavorite: false })]
        expect(restoreUserState(rebuilt, before)[0]?.isFavorite).toBe(false)
    })

    it('is a no-op when there was nothing before', () => {
        const rebuilt = [makeGame({ steamAppId: '1' })]
        expect(restoreUserState(rebuilt, [])).toBe(rebuilt)
    })

    // Manual rows survive the clear, so they appear in BOTH lists. Restoring
    // must not duplicate or disturb them.
    it('leaves surviving manual rows exactly as they are', () => {
        const manual = makeGame({ source: 'manual', title: 'My GOG game', isFavorite: true })
        const result = restoreUserState([manual, makeGame({ steamAppId: '1' })], [manual])
        expect(result[0]).toBe(manual)
        expect(result).toHaveLength(2)
    })
})
