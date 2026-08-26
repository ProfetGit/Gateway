import { describe, it, expect } from 'vitest'
import {
    isExcluded,
    normalizeName,
    rankGameExecutables,
    relativeToDriveC,
    type ExecutableCandidate,
} from './rank-game-executables'

const MB = 1024 * 1024

function exe(path: string, sizeMb: number): ExecutableCandidate {
    return { path, size: sizeMb * MB }
}

const PREFIX = '/home/u/Games/Gateway/prefixes/hades/pfx/drive_c'

describe('relativeToDriveC', () => {
    it('strips everything up to and including drive_c', () => {
        expect(relativeToDriveC(`${PREFIX}/Program Files/Hades/Hades.exe`)).toBe(
            'program files/hades/hades.exe'
        )
    })

    it('handles a prefix without the pfx level', () => {
        expect(relativeToDriveC('/p/hades/drive_c/GOG Games/Hades/x.exe')).toBe('gog games/hades/x.exe')
    })

    it('falls back to the whole path when there is no drive_c', () => {
        expect(relativeToDriveC('/opt/Hades/Hades.exe')).toBe('opt/hades/hades.exe')
    })
})

describe('isExcluded', () => {
    it.each([
        'unins000.exe',
        'Uninstall.exe',
        'setup.exe',
        'Setup_x64.exe',
        'install.exe',
        'vcredist_x64.exe',
        'VC_redist.x86.exe',
        'DXSETUP.exe',
        'dotNetFx45_Full_setup.exe',
        'UnityCrashHandler64.exe',
        'crashpad_handler.exe',
        'UE4PrereqSetup_x64.exe',
        'EasyAntiCheat_Setup.exe',
    ])('drops %s', (name) => {
        expect(isExcluded(`${PREFIX}/Program Files/Hades/${name}`)).toBe(true)
    })

    it.each([
        'windows/system32/notepad.exe',
        'Program Files/Common Files/thing.exe',
        'Program Files/Hades/_CommonRedist/vcredist/x.exe',
        'Program Files/Hades/redist/x.exe',
        'Program Files/Hades/DirectX/x.exe',
    ])('drops anything under %s', (relative) => {
        expect(isExcluded(`${PREFIX}/${relative}`)).toBe(true)
    })

    it.each(['Hades.exe', 'Game.exe', 'launcher.exe', 'run.bat'])('keeps %s', (name) => {
        expect(isExcluded(`${PREFIX}/Program Files/Hades/${name}`)).toBe(false)
    })
})

describe('normalizeName', () => {
    it.each([
        ['The Witcher 3: Wild Hunt', 'thewitcher3wildhunt'],
        ['S.T.A.L.K.E.R.', 'stalker'],
        ['Hades_x64', 'hadesx64'],
    ] as const)('%s -> %s', (input, expected) => {
        expect(normalizeName(input)).toBe(expected)
    })
})

describe('rankGameExecutables', () => {
    // The case this whole module exists for: the uninstaller is often the
    // only other .exe, and it sorts first alphabetically.
    it('puts the game above the uninstaller', () => {
        const ranked = rankGameExecutables(
            [
                exe(`${PREFIX}/Program Files/Hades/unins000.exe`, 3),
                exe(`${PREFIX}/Program Files/Hades/Hades.exe`, 40),
            ],
            'Hades'
        )
        expect(ranked.map((r) => r.name)).toEqual(['Hades.exe'])
    })

    it('prefers a name that matches the title over a bigger unrelated binary', () => {
        const ranked = rankGameExecutables(
            [
                exe(`${PREFIX}/Program Files/Hades/BigTool.exe`, 900),
                exe(`${PREFIX}/Program Files/Hades/Hades.exe`, 12),
            ],
            'Hades'
        )
        expect(ranked[0]?.name).toBe('Hades.exe')
    })

    it('falls back to the biggest binary when nothing matches the title', () => {
        const ranked = rankGameExecutables(
            [
                exe(`${PREFIX}/Program Files/Thing/helper.exe`, 2),
                exe(`${PREFIX}/Program Files/Thing/engine.exe`, 400),
            ],
            'Some Unrelated Title'
        )
        expect(ranked[0]?.name).toBe('engine.exe')
    })

    it('uses the containing folder when the file name is generic', () => {
        const ranked = rankGameExecutables(
            [
                exe(`${PREFIX}/Program Files/Other/game.exe`, 50),
                exe(`${PREFIX}/GOG Games/Hades/game.exe`, 50),
            ],
            'Hades'
        )
        expect(ranked[0]?.path).toContain('GOG Games/Hades')
    })

    it('prefers a shallower entry point over a buried one of the same name', () => {
        const ranked = rankGameExecutables(
            [
                exe(`${PREFIX}/Program Files/Hades/Engine/Binaries/Win64/Hades.exe`, 40),
                exe(`${PREFIX}/Program Files/Hades/Hades.exe`, 40),
            ],
            'Hades'
        )
        expect(ranked[0]?.path).toBe(`${PREFIX}/Program Files/Hades/Hades.exe`)
    })

    it('prefers .exe over .bat when everything else ties', () => {
        const ranked = rankGameExecutables(
            [
                exe(`${PREFIX}/Program Files/Hades/hades.bat`, 40),
                exe(`${PREFIX}/Program Files/Hades/hades.exe`, 40),
            ],
            'Hades'
        )
        expect(ranked[0]?.name).toBe('hades.exe')
    })

    it('matches a title with punctuation the file name drops', () => {
        const ranked = rankGameExecutables(
            [
                exe(`${PREFIX}/Program Files/Witcher/other.exe`, 500),
                exe(`${PREFIX}/Program Files/Witcher/thewitcher3.exe`, 20),
            ],
            'The Witcher 3: Wild Hunt'
        )
        expect(ranked[0]?.name).toBe('thewitcher3.exe')
    })

    it('returns [] when the installer left nothing worth launching', () => {
        expect(rankGameExecutables([exe(`${PREFIX}/Program Files/x/unins000.exe`, 1)], 'X')).toEqual([])
    })

    it('is deterministic for identical candidates', () => {
        const input = [exe(`${PREFIX}/a/b.exe`, 10), exe(`${PREFIX}/a/a.exe`, 10)]
        expect(rankGameExecutables(input, 'zzz').map((r) => r.name)).toEqual(
            rankGameExecutables([...input].reverse(), 'zzz').map((r) => r.name)
        )
    })
})
