import { describe, it, expect } from 'vitest'
import { GameSchema } from './game-library-schema'
import type { Game as MainProcessGame } from '../../../../electron/src/shared/types'

// GameSchema is the only schema whose failure is total: get-games.ts parses
// through GameSchema.array(), so one bad row empties the entire library grid.

const MINIMAL = {
    id: 'g1',
    title: 'Hades',
    isInstalled: false,
    isFavorite: false,
    source: 'manual',
}

describe('GameSchema', () => {
    it('accepts a minimal game', () => {
        expect(GameSchema.parse(MINIMAL)).toMatchObject(MINIMAL)
    })

    it.each(['manual', 'steam', 'shortcut', 'heroic', 'lutris'])(
        'accepts source %s',
        (source) => {
            expect(GameSchema.parse({ ...MINIMAL, source }).source).toBe(source)
        }
    )

    // Pins the .catch('manual') decision. Without it a single unrecognised
    // source — including a stale source:'lutris' row written before 97d1e86 —
    // throws and takes the whole library down.
    it('degrades an unknown source to manual instead of throwing', () => {
        expect(() => GameSchema.parse({ ...MINIMAL, source: 'epic' })).not.toThrow()
        expect(GameSchema.parse({ ...MINIMAL, source: 'epic' }).source).toBe('manual')
    })

    it('survives an array containing one unknown source', () => {
        const rows = [MINIMAL, { ...MINIMAL, id: 'g2', source: 'gog-galaxy' }]
        expect(GameSchema.array().parse(rows)).toHaveLength(2)
    })

    it('accepts a fully populated game', () => {
        const full = {
            ...MINIMAL,
            source: 'lutris',
            coverUrl: 'https://cdn/cover.jpg',
            localCoverPath: 'abc.jpg',
            executablePath: '/games/hades',
            steamAppId: '1145360',
            metadataAppId: '1145360',
            manualUnlocks: { ACH_ONE: 1700000000 },
            winePrefix: '/prefixes/hades',
            shortcutId: '12345',
            heroicAppName: 'Hades',
            heroicRunner: 'gog',
            lutrisId: 7,
            lutrisSlug: 'hades',
            playtime: 120,
            lastPlayed: '2026-08-25T19:00:00.000Z',
            sizeOnDisk: 1024,
            notes: 'good',
            launchArgs: '-windowed',
            heroImageUrl: 'gateway://hero/x.jpg',
            logoImageUrl: 'gateway://logo/x.png',
            customEnvVars: 'MANGOHUD=1',
            appType: 'game',
        }
        expect(GameSchema.parse(full)).toMatchObject(full)
    })

    it.each(['legendary', 'gog', 'sideload'])('accepts heroicRunner %s', (runner) => {
        expect(GameSchema.parse({ ...MINIMAL, heroicRunner: runner }).heroicRunner).toBe(runner)
    })

    it.each([
        ['missing id', { title: 'No id' }],
        ['missing title', { id: 'x' }],
        ['lutrisId as string', { ...MINIMAL, lutrisId: 'seven' }],
        ['isInstalled as string', { ...MINIMAL, isInstalled: 'yes' }],
        ['unknown heroicRunner', { ...MINIMAL, heroicRunner: 'wine' }],
    ] as const)('rejects %s', (_label, row) => {
        expect(() => GameSchema.parse(row)).toThrow()
    })

    // TypeScript cannot catch drift between the main and renderer Game
    // declarations — they are separate interfaces in separate tsconfigs. This
    // turns that drift into a red build, and pulls electron/src/shared/types.ts
    // into the typecheck graph as a side benefit.
    it('accepts an object typed as the main-process Game', () => {
        const fromMain: MainProcessGame = {
            id: 'g1',
            title: 'Cross-process',
            isInstalled: true,
            isFavorite: true,
            source: 'heroic',
            heroicAppName: 'Fortnite',
            heroicRunner: 'legendary',
            lutrisId: 3,
            lutrisSlug: 'fortnite',
            manualUnlocks: { A: 1 },
            appType: 'game',
            playtime: 5,
            sizeOnDisk: 10,
            customEnvVars: 'A=1',
        }
        expect(() => GameSchema.parse(fromMain)).not.toThrow()
        expect(GameSchema.parse(fromMain).source).toBe('heroic')
    })
})
