import { describe, it, expect } from 'vitest'
import {
    buildUpdates,
    canSave,
    draftFromGame,
    isDirty,
    usesGatewayRuntime,
} from './game-properties-form-logic'
import type { Game } from '../../game-library-types'

function makeGame(overrides: Partial<Game> = {}): Game {
    return {
        id: 'g1',
        title: 'Hades',
        isInstalled: true,
        isFavorite: false,
        source: 'manual',
        ...overrides,
    }
}

describe('draftFromGame', () => {
    it('fills every absent optional field with an empty control value', () => {
        expect(draftFromGame(makeGame())).toEqual({
            title: 'Hades',
            executablePath: '',
            coverUrl: '',
            notes: '',
            runner: 'auto',
            protonPath: '',
            winePrefix: '',
            umuGameId: '',
            launchArgs: '',
            customEnvVars: '',
            useMangoHud: false,
            useGameMode: false,
        })
    })

    it('round-trips a populated game with no changes', () => {
        const game = makeGame({
            executablePath: '/g/game.exe',
            runner: 'umu',
            winePrefix: '/p/hades',
            launchArgs: '-windowed',
            useGameMode: true,
        })
        expect(buildUpdates(game, draftFromGame(game))).toEqual({})
    })
})

describe('buildUpdates', () => {
    it('sends only the fields that changed', () => {
        const game = makeGame({ executablePath: '/g/a.exe', launchArgs: '-a' })
        const draft = { ...draftFromGame(game), launchArgs: '-b' }
        expect(buildUpdates(game, draft)).toEqual({ launchArgs: '-b' })
    })

    // update_game deletes a key when the value is an explicit undefined. An
    // empty string would persist a useless key and, for runner, fail the schema.
    it('clears a emptied text field with an explicit undefined', () => {
        const game = makeGame({ winePrefix: '/p/hades' })
        const updates = buildUpdates(game, { ...draftFromGame(game), winePrefix: '' })
        expect(updates).toHaveProperty('winePrefix')
        expect(updates.winePrefix).toBeUndefined()
    })

    it('trims whitespace before comparing, so a stray space is not a change', () => {
        const game = makeGame({ launchArgs: '-windowed' })
        expect(buildUpdates(game, { ...draftFromGame(game), launchArgs: '  -windowed  ' })).toEqual({})
    })

    it('trims the value it does send', () => {
        const game = makeGame()
        expect(buildUpdates(game, { ...draftFromGame(game), launchArgs: '  -dx11 ' })).toEqual({
            launchArgs: '-dx11',
        })
    })

    // 'auto' is the absence of a choice, not a value worth storing.
    it("clears runner when the user picks 'auto'", () => {
        const game = makeGame({ runner: 'umu' })
        const updates = buildUpdates(game, { ...draftFromGame(game), runner: 'auto' })
        expect(updates).toHaveProperty('runner')
        expect(updates.runner).toBeUndefined()
    })

    it("does not write runner when it was already absent and stays 'auto'", () => {
        expect(buildUpdates(makeGame(), draftFromGame(makeGame()))).toEqual({})
    })

    it('persists an explicit runner choice', () => {
        expect(buildUpdates(makeGame(), { ...draftFromGame(makeGame()), runner: 'wine' })).toEqual({
            runner: 'wine',
        })
    })

    it.each([
        ['useMangoHud', 'useMangoHud'],
        ['useGameMode', 'useGameMode'],
    ] as const)('sends %s when toggled on', (_label, key) => {
        expect(buildUpdates(makeGame(), { ...draftFromGame(makeGame()), [key]: true })).toEqual({
            [key]: true,
        })
    })

    it('sends false when a toggle is turned back off', () => {
        const game = makeGame({ useGameMode: true })
        expect(buildUpdates(game, { ...draftFromGame(game), useGameMode: false })).toEqual({
            useGameMode: false,
        })
    })

    it('treats an absent toggle as off, not as a change', () => {
        expect(buildUpdates(makeGame(), { ...draftFromGame(makeGame()), useMangoHud: false })).toEqual({})
    })
})

describe('isDirty', () => {
    it('is false for an untouched draft', () => {
        const game = makeGame({ notes: 'x' })
        expect(isDirty(game, draftFromGame(game))).toBe(false)
    })

    it('is true once any field differs', () => {
        const game = makeGame()
        expect(isDirty(game, { ...draftFromGame(game), notes: 'x' })).toBe(true)
    })
})

describe('canSave', () => {
    it.each([
        ['a title', 'Hades', true],
        ['whitespace only', '   ', false],
        ['empty', '', false],
    ] as const)('%s -> %s', (_label, title, expected) => {
        expect(canSave({ ...draftFromGame(makeGame()), title })).toBe(expected)
    })
})

describe('usesGatewayRuntime', () => {
    // A Proton build set on one of these would be silently ignored — the other
    // launcher owns the runtime, so the controls must say so rather than lie.
    it.each([
        ['a Heroic game', { heroicAppName: 'Fortnite', heroicRunner: 'legendary' as const }],
        ['a Lutris game', { lutrisId: 7 }],
        ['an owned Steam game', { steamAppId: '1145360' }],
    ] as const)('is false for %s', (_label, overrides) => {
        expect(usesGatewayRuntime(makeGame(overrides))).toBe(false)
    })

    it.each([
        ['a manual game', {}],
        ['a non-Steam shortcut', { shortcutId: '123', winePrefix: '/p/a' }],
        ['a Steam-matched manual game', { metadataAppId: '1145360' }],
    ] as const)('is true for %s', (_label, overrides) => {
        expect(usesGatewayRuntime(makeGame(overrides))).toBe(true)
    })
})
