import { describe, it, expect, vi, afterEach } from 'vitest'
import { GameSchema, parseGames } from './game-library-schema'
import type { Game as MainProcessGame } from '../../../../electron/src/shared/types'

// GameSchema guards the app's first load. It used to be the schema whose
// failure was total — get-games.ts parsed through GameSchema.array(), so one
// bad row emptied the whole grid. parseGames() below now contains that blast
// radius to the offending row.

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

describe('appType tolerance', () => {
    // The exact row that emptied a 462-game library on every restart: Steam's
    // appdetails returned type "advertising", which the enum did not list.
    const REAL_BROKEN_ROW = {
        id: '3026dd24-43c0-4fa7-88f6-a5f3e525663a',
        title: 'Call of Duty: Black Ops II - Zombies',
        steamAppId: '212910',
        isInstalled: false,
        isFavorite: false,
        source: 'steam',
        appType: 'advertising',
    }

    it('accepts the Steam type that used to break the library', () => {
        expect(GameSchema.parse(REAL_BROKEN_ROW).appType).toBe('advertising')
    })

    it.each(['game', 'dlc', 'demo', 'mod', 'application', 'music', 'video', 'series', 'episode', 'advertising', 'hardware'])(
        'accepts appType %s',
        (appType) => {
            expect(GameSchema.parse({ ...MINIMAL, appType }).appType).toBe(appType)
        }
    )

    it('degrades a still-unknown appType to undefined rather than throwing', () => {
        expect(() => GameSchema.parse({ ...MINIMAL, appType: 'some-new-thing' })).not.toThrow()
        expect(GameSchema.parse({ ...MINIMAL, appType: 'some-new-thing' }).appType).toBeUndefined()
    })
})

describe('parseGames', () => {
    afterEach(() => vi.restoreAllMocks())

    it('parses a clean library', () => {
        expect(parseGames([MINIMAL, { ...MINIMAL, id: 'g2' }])).toHaveLength(2)
    })

    // The regression that actually bit: one bad row must cost one row, not all.
    it('keeps every good row when one row is irreparably malformed', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        const rows = [
            MINIMAL,
            { id: 'broken', isInstalled: false, isFavorite: false, source: 'steam' }, // no title
            { ...MINIMAL, id: 'g3' },
        ]
        const parsed = parseGames(rows)
        expect(parsed.map((g) => g.id)).toEqual(['g1', 'g3'])
    })

    it('logs what it dropped, so the data problem still gets noticed', () => {
        const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
        parseGames([{ id: 'broken' }])
        expect(spy).toHaveBeenCalledWith(
            expect.stringContaining('Dropped 1 malformed game row(s) of 1'),
            expect.anything()
        )
    })

    it('returns [] for a non-array instead of throwing', () => {
        vi.spyOn(console, 'error').mockImplementation(() => {})
        expect(parseGames(null)).toEqual([])
        expect(parseGames({ games: [] })).toEqual([])
    })

    it('returns [] for an empty library', () => {
        expect(parseGames([])).toEqual([])
    })
})
