import { describe, it, expect } from 'vitest'
import {
    parseLegendaryLibrary,
    parseLegendaryInstalled,
    parseGogInstalled,
    parseSideloadLibrary,
} from './heroic-library-parser'

const noMetadata = () => null

describe('parseLegendaryLibrary', () => {
    const library = {
        library: [
            {
                app_name: 'Fortnite',
                title: 'Fortnite',
                is_installed: true,
                art_square: 'https://cdn/tall.png',
                art_cover: 'https://cdn/wide.png',
                install: { install_path: '/games/fn', executable: 'fn.exe', install_size: 100 },
            },
            { app_name: 'Owned', title: 'Owned Not Installed', is_installed: false },
        ],
    }

    it('splits installed from merely owned', () => {
        const games = parseLegendaryLibrary(library)
        expect(games.map((g) => g.isInstalled)).toEqual([true, false])
    })

    // art_square is the 600x800 portrait; art_cover is the wide banner.
    // Inverting these is the easy mistake and the grid expects a tall cover.
    it('maps art_square to cover and art_cover to hero', () => {
        const [game] = parseLegendaryLibrary(library)
        expect(game).toMatchObject({
            coverUrl: 'https://cdn/tall.png',
            heroUrl: 'https://cdn/wide.png',
        })
    })

    it('falls back to art_cover for the cover when art_square is absent', () => {
        const games = parseLegendaryLibrary({
            library: [{ app_name: 'A', title: 'A', art_cover: 'https://cdn/wide.png' }],
        })
        expect(games[0]).toMatchObject({
            coverUrl: 'https://cdn/wide.png',
            heroUrl: 'https://cdn/wide.png',
        })
    })

    it('carries install details through', () => {
        const [game] = parseLegendaryLibrary(library)
        expect(game).toMatchObject({
            installPath: '/games/fn',
            executable: 'fn.exe',
            installSize: 100,
            runner: 'legendary',
        })
    })

    it('defaults platform to Windows', () => {
        const games = parseLegendaryLibrary({ library: [{ app_name: 'A', title: 'A' }] })
        expect(games[0]!.platform).toBe('Windows')
    })

    it('skips entries with no title', () => {
        const games = parseLegendaryLibrary({ library: [{ app_name: 'A' }, { app_name: 'B', title: 'B' }] })
        expect(games.map((g) => g.appName)).toEqual(['B'])
    })

    it('skips entries with no app_name', () => {
        expect(parseLegendaryLibrary({ library: [{ title: 'Orphan' }] })).toEqual([])
    })

    it.each([[{}], [{ library: null }], [[]], [undefined], [null], ['nonsense'], [42]])(
        'returns [] for malformed input %#',
        (input) => {
            expect(parseLegendaryLibrary(input)).toEqual([])
        }
    )
})

describe('parseLegendaryInstalled', () => {
    it('marks everything installed and reads metadata key images', () => {
        const games = parseLegendaryInstalled(
            { AppA: { app_name: 'AppA', title: 'Game A', install_path: '/g/a' } },
            () => ({
                app_title: 'Ignored',
                metadata: {
                    keyImages: [
                        { type: 'DieselGameBoxTall', url: 'https://cdn/tall.png' },
                        { type: 'DieselGameBox', url: 'https://cdn/wide.png' },
                    ],
                },
            })
        )
        expect(games[0]).toMatchObject({
            title: 'Game A',
            isInstalled: true,
            coverUrl: 'https://cdn/tall.png',
            heroUrl: 'https://cdn/wide.png',
        })
    })

    it('skips DLC entries', () => {
        const games = parseLegendaryInstalled(
            { A: { app_name: 'A', title: 'A' }, D: { app_name: 'D', title: 'D', is_dlc: true } },
            noMetadata
        )
        expect(games.map((g) => g.appName)).toEqual(['A'])
    })

    it('falls back to the metadata title, then the record key', () => {
        expect(parseLegendaryInstalled({ Keyed: {} }, () => ({ app_title: 'From Metadata' }))[0])
            .toMatchObject({ appName: 'Keyed', title: 'From Metadata' })
        expect(parseLegendaryInstalled({ Keyed: {} }, noMetadata)[0])
            .toMatchObject({ appName: 'Keyed', title: 'Keyed' })
    })

    it('survives missing metadata', () => {
        const games = parseLegendaryInstalled({ A: { app_name: 'A', title: 'A' } }, noMetadata)
        expect(games[0]).toMatchObject({ coverUrl: undefined, heroUrl: undefined })
    })

    it.each([[null], [undefined], [[]], ['nope']])('returns [] for malformed input %#', (input) => {
        expect(parseLegendaryInstalled(input, noMetadata)).toEqual([])
    })
})

describe('parseGogInstalled', () => {
    it('reads a record keyed by appName', () => {
        const games = parseGogInstalled({
            '1207658930': {
                appName: '1207658930',
                title: 'The Witcher',
                install_path: '/g/w',
                install_size: 20,
            },
        })
        expect(games[0]).toMatchObject({
            appName: '1207658930',
            title: 'The Witcher',
            runner: 'gog',
            isInstalled: true,
        })
    })

    it('uses the record key when the value omits appName', () => {
        const games = parseGogInstalled({ fallbackKey: { title: 'Some Game' } })
        expect(games[0]).toMatchObject({ appName: 'fallbackKey', title: 'Some Game' })
    })

    it('falls back to the key for the title too', () => {
        expect(parseGogInstalled({ onlyKey: {} })[0]).toMatchObject({ title: 'onlyKey' })
    })

    it.each([[null], [undefined], [[]], [7]])('returns [] for malformed input %#', (input) => {
        expect(parseGogInstalled(input)).toEqual([])
    })
})

describe('parseSideloadLibrary', () => {
    it('reads a flat array', () => {
        const games = parseSideloadLibrary([
            {
                app_name: 'my-app',
                title: 'My App',
                install: { install_path: '/opt/app', executable: 'run.sh' },
                art_square: 'https://cdn/tall.png',
            },
        ])
        expect(games[0]).toMatchObject({
            appName: 'my-app',
            title: 'My App',
            runner: 'sideload',
            isInstalled: true,
            executable: 'run.sh',
            coverUrl: 'https://cdn/tall.png',
        })
    })

    it('tolerates a missing install block', () => {
        const games = parseSideloadLibrary([{ app_name: 'bare' }])
        expect(games[0]).toMatchObject({ appName: 'bare', title: 'bare', installPath: undefined })
    })

    it('skips entries with no app_name', () => {
        expect(parseSideloadLibrary([{ title: 'Orphan' }])).toEqual([])
    })

    // A record instead of an array is the shape drift most likely to appear.
    it.each([[{}], [null], [undefined], ['nope']])('returns [] for non-array input %#', (input) => {
        expect(parseSideloadLibrary(input)).toEqual([])
    })
})
