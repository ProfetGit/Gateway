import { describe, it, expect } from 'vitest'
import { resolveLaunch, parseEnvVars } from './resolve-launch'
import type { Game } from '../../shared/types'

function makeGame(overrides: Partial<Game>): Game {
    return {
        id: 'g1',
        title: 'Test Game',
        isInstalled: true,
        isFavorite: false,
        source: 'manual',
        ...overrides,
    }
}

describe('parseEnvVars', () => {
    it('parses space-separated pairs', () => {
        expect(parseEnvVars('A=1 B=2')).toEqual({ A: '1', B: '2' })
    })

    it('returns empty for undefined', () => {
        expect(parseEnvVars(undefined)).toEqual({})
    })

    it('ignores tokens without an =', () => {
        expect(parseEnvVars('MALFORMED')).toEqual({})
    })

    it('splits on the first = only, so values may contain =', () => {
        expect(parseEnvVars('PATH=/a=b')).toEqual({ PATH: '/a=b' })
    })

    it('ignores a leading = (empty key)', () => {
        expect(parseEnvVars('=novalue')).toEqual({})
    })
})

describe('resolveLaunch', () => {
    describe('URI sources', () => {
        it('resolves a Heroic game to the heroic:// scheme', () => {
            const plan = resolveLaunch(
                makeGame({ source: 'heroic', heroicAppName: 'Fortnite', heroicRunner: 'legendary' }),
                {}
            )
            expect(plan).toEqual({ kind: 'uri', uri: 'heroic://launch/legendary/Fortnite' })
        })

        it('resolves a Lutris game to the single-colon lutris: scheme', () => {
            const plan = resolveLaunch(makeGame({ source: 'lutris', lutrisId: 42 }), {})
            expect(plan).toEqual({ kind: 'uri', uri: 'lutris:rungameid/42' })
        })

        it('resolves a Steam game to steam://rungameid', () => {
            const plan = resolveLaunch(makeGame({ source: 'steam', steamAppId: '440' }), {})
            expect(plan).toEqual({ kind: 'uri', uri: 'steam://rungameid/440' })
        })

        it('treats lutrisId 0 as present, not falsy', () => {
            const plan = resolveLaunch(makeGame({ source: 'lutris', lutrisId: 0 }), {})
            expect(plan).toEqual({ kind: 'uri', uri: 'lutris:rungameid/0' })
        })
    })

    describe('precedence', () => {
        // Both scanners may attach a metadata-only steamAppId. Routing through
        // steam://rungameid for an unowned game fails silently.
        it('prefers Heroic over a metadata-only steamAppId', () => {
            const plan = resolveLaunch(
                makeGame({
                    source: 'heroic',
                    heroicAppName: 'Alan Wake',
                    heroicRunner: 'gog',
                    steamAppId: '108710',
                }),
                {}
            )
            // Encoded: a raw space would make this a malformed URI.
            expect(plan).toEqual({ kind: 'uri', uri: 'heroic://launch/gog/Alan%20Wake' })
        })

        it('prefers Lutris over a metadata-only steamAppId', () => {
            const plan = resolveLaunch(
                makeGame({ source: 'lutris', lutrisId: 7, steamAppId: '440' }),
                {}
            )
            expect(plan).toEqual({ kind: 'uri', uri: 'lutris:rungameid/7' })
        })

        it('prefers Steam over an executablePath', () => {
            const plan = resolveLaunch(
                makeGame({ source: 'steam', steamAppId: '440', executablePath: '/games/tf2' }),
                {}
            )
            expect(plan).toEqual({ kind: 'uri', uri: 'steam://rungameid/440' })
        })

        it('falls back to executablePath when heroicRunner is missing', () => {
            const plan = resolveLaunch(
                makeGame({ heroicAppName: 'Orphaned', executablePath: '/games/run.sh' }),
                {}
            )
            expect(plan.kind).toBe('spawn')
        })
    })

    describe('URI encoding', () => {
        it.each([
            ['Alan Wake', 'Alan%20Wake'],
            ['Game #2', 'Game%20%232'],
            ['A/B', 'A%2FB'],
            ['Café', 'Caf%C3%A9'],
            ['100%', '100%25'],
        ])('encodes appName %p', (appName, encoded) => {
            const plan = resolveLaunch(
                makeGame({ source: 'heroic', heroicAppName: appName, heroicRunner: 'sideload' }),
                {}
            )
            expect(plan).toEqual({ kind: 'uri', uri: `heroic://launch/sideload/${encoded}` })
        })

        it('leaves an opaque Epic id untouched', () => {
            const plan = resolveLaunch(
                makeGame({ source: 'heroic', heroicAppName: 'Fortnite', heroicRunner: 'legendary' }),
                {}
            )
            expect(plan).toEqual({ kind: 'uri', uri: 'heroic://launch/legendary/Fortnite' })
        })
    })

    describe('spawn branch', () => {
        it('wraps a Windows executable in wine', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/games/game.exe' }), {})
            expect(plan).toMatchObject({
                kind: 'spawn',
                command: 'wine',
                args: ['/games/game.exe'],
            })
        })

        it.each(['.msi', '.bat'])('wine-wraps %s too', (ext) => {
            const plan = resolveLaunch(makeGame({ executablePath: `/games/setup${ext}` }), {})
            expect(plan).toMatchObject({ kind: 'spawn', command: 'wine' })
        })

        it('runs a native binary directly, without wine', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/games/native' }), {})
            expect(plan).toMatchObject({ kind: 'spawn', command: '/games/native', args: [] })
        })

        it('appends launchArgs after the executable for wine', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', launchArgs: '-windowed -dx11' }),
                {}
            )
            expect(plan).toMatchObject({ args: ['/g/game.exe', '-windowed', '-dx11'] })
        })

        it('inherits the base env', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/g/native' }), { HOME: '/home/x' })
            expect(plan).toMatchObject({ env: { HOME: '/home/x' } })
        })
    })

    describe('wine prefix', () => {
        it('sets WINEPREFIX from game.winePrefix', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', winePrefix: '/prefixes/a' }),
                {}
            )
            expect(plan).toMatchObject({ env: { WINEPREFIX: '/prefixes/a' } })
        })

        it('lets an explicit customEnvVars WINEPREFIX win', () => {
            const plan = resolveLaunch(
                makeGame({
                    executablePath: '/g/game.exe',
                    winePrefix: '/prefixes/a',
                    customEnvVars: 'WINEPREFIX=/prefixes/override',
                }),
                {}
            )
            expect(plan).toMatchObject({ env: { WINEPREFIX: '/prefixes/override' } })
        })
    })

    describe('no target', () => {
        // This is what gates the lastPlayed write in library-ipc.ts.
        it('returns kind none when nothing is launchable', () => {
            expect(resolveLaunch(makeGame({}), {}).kind).toBe('none')
        })
    })
})
