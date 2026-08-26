import { describe, it, expect } from 'vitest'
import { resolveLaunch, resolveRunner } from './resolve-launch'
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

    describe('runner selection', () => {
        it.each(['.exe', '.msi', '.bat'])('routes %s through umu when umu is installed', (ext) => {
            expect(resolveRunner(makeGame({ executablePath: `/g/game${ext}` }), true)).toBe('umu')
        })

        // Bare wine is the fallback, not the goal: no Proton, no DXVK, no
        // protonfixes. It only beats not launching at all.
        it('falls back to wine for a Windows exe when umu is missing', () => {
            expect(resolveRunner(makeGame({ executablePath: '/g/game.exe' }), false)).toBe('wine')
        })

        it('treats a non-Windows executable as native', () => {
            expect(resolveRunner(makeGame({ executablePath: '/g/game' }), true)).toBe('native')
        })

        it.each(['umu', 'wine', 'native'] as const)('honours an explicit runner %s', (runner) => {
            // Extension says Windows; the explicit choice must still win.
            expect(resolveRunner(makeGame({ executablePath: '/g/game.exe', runner }), true)).toBe(runner)
        })

        it("treats 'auto' and undefined identically", () => {
            const auto = makeGame({ executablePath: '/g/game.exe', runner: 'auto' })
            const absent = makeGame({ executablePath: '/g/game.exe' })
            expect(resolveRunner(auto, true)).toBe(resolveRunner(absent, true))
        })
    })

    describe('spawn branch', () => {
        it('runs a Windows executable through umu-run', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/games/game.exe' }), {}, true)
            expect(plan).toMatchObject({
                kind: 'spawn',
                command: 'umu-run',
                args: ['/games/game.exe'],
                runner: 'umu',
            })
        })

        it('wraps a Windows executable in wine when umu is unavailable', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/games/game.exe' }), {}, false)
            expect(plan).toMatchObject({
                kind: 'spawn',
                command: 'wine',
                args: ['/games/game.exe'],
                runner: 'wine',
            })
        })

        it('runs a native binary directly, without a wrapper', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/games/native' }), {}, true)
            expect(plan).toMatchObject({
                kind: 'spawn',
                command: '/games/native',
                args: [],
                runner: 'native',
            })
        })

        it('appends launchArgs after the executable', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', launchArgs: '-windowed -dx11' }),
                {},
                true
            )
            expect(plan).toMatchObject({ args: ['/g/game.exe', '-windowed', '-dx11'] })
        })

        // The whole reason launchArgs stopped being a whitespace split.
        it('keeps a quoted launch argument as one token', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', launchArgs: '-config "/home/u/My Games/x.ini"' }),
                {},
                true
            )
            expect(plan).toMatchObject({ args: ['/g/game.exe', '-config', '/home/u/My Games/x.ini'] })
        })

        it('inherits the base env', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/g/native' }), { HOME: '/home/x' }, true)
            expect(plan).toMatchObject({ env: { HOME: '/home/x' } })
        })
    })

    describe('umu environment', () => {
        // steamAppId can never reach here — it left as a steam:// URI above.
        // metadataAppId is what a manually-added game matched to a Steam entry
        // for art actually carries, and it is the id protonfixes looks up.
        it('derives GAMEID from metadataAppId so protonfixes can match the title', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', metadataAppId: '1145360' }),
                {},
                true
            )
            expect(plan).toMatchObject({ env: { GAMEID: 'umu-1145360' } })
        })

        it('still routes an owned Steam game to steam:// rather than umu', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', runner: 'umu', steamAppId: '1145360' }),
                {},
                true
            )
            expect(plan).toEqual({ kind: 'uri', uri: 'steam://rungameid/1145360' })
        })

        it('falls back to the generic GAMEID when nothing identifies the game', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/g/game.exe' }), {}, true)
            expect(plan).toMatchObject({ env: { GAMEID: '0', PROTON_VERB: 'waitforexitandrun' } })
        })

        it('prefers an explicit umuGameId over the derived one', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', metadataAppId: '1', umuGameId: 'umu-999' }),
                {},
                true
            )
            expect(plan).toMatchObject({ env: { GAMEID: 'umu-999' } })
        })

        it('passes protonPath through as PROTONPATH', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', protonPath: '/tools/GE-Proton11-5' }),
                {},
                true
            )
            expect(plan).toMatchObject({ env: { PROTONPATH: '/tools/GE-Proton11-5' } })
        })

        it('leaves PROTONPATH unset so umu picks and downloads its own Proton', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/g/game.exe' }), {}, true)
            expect((plan as { env: NodeJS.ProcessEnv }).env.PROTONPATH).toBeUndefined()
        })

        it('sets no umu variables for a native game', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/g/native' }), {}, true)
            const { env } = plan as { env: NodeJS.ProcessEnv }
            expect(env.GAMEID).toBeUndefined()
            expect(env.PROTON_VERB).toBeUndefined()
        })
    })

    describe('MangoHud and GameMode', () => {
        // Under Proton the game is Vulkan via DXVK, so the implicit layer is
        // the switch that works. Wrapping umu-run in the mangohud script looks
        // like it silently does nothing.
        it('enables MangoHud by env for umu, not by wrapping the command', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', useMangoHud: true }),
                {},
                true
            )
            expect(plan).toMatchObject({ command: 'umu-run', env: { MANGOHUD: '1' } })
        })

        it('enables MangoHud by env for wine too', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', useMangoHud: true, runner: 'wine' }),
                {},
                true
            )
            expect(plan).toMatchObject({ command: 'wine', env: { MANGOHUD: '1' } })
        })

        // Native games may still be OpenGL, where the Vulkan layer never loads.
        it('wraps a native game in the mangohud command instead', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/native', useMangoHud: true }),
                {},
                true
            )
            expect(plan).toMatchObject({ command: 'mangohud', args: ['/g/native'] })
        })

        it('leaves MANGOHUD unset when the toggle is off', () => {
            const plan = resolveLaunch(makeGame({ executablePath: '/g/game.exe' }), {}, true)
            expect((plan as { env: NodeJS.ProcessEnv }).env.MANGOHUD).toBeUndefined()
        })

        it('puts gamemoderun at the head of the chain', () => {
            const plan = resolveLaunch(
                makeGame({ executablePath: '/g/game.exe', useGameMode: true }),
                {},
                true
            )
            expect(plan).toMatchObject({ command: 'gamemoderun', args: ['umu-run', '/g/game.exe'] })
        })

        it('composes gamemode, mangohud and args for a native game', () => {
            const plan = resolveLaunch(
                makeGame({
                    executablePath: '/g/native',
                    useGameMode: true,
                    useMangoHud: true,
                    launchArgs: '-fullscreen',
                }),
                {},
                true
            )
            expect(plan).toMatchObject({
                command: 'gamemoderun',
                args: ['mangohud', '/g/native', '-fullscreen'],
            })
        })
    })

    describe('no target', () => {
        // This is what gates the lastPlayed write in library-ipc.ts.
        it('returns kind none when nothing is launchable', () => {
            expect(resolveLaunch(makeGame({}), {}).kind).toBe('none')
        })
    })
})
