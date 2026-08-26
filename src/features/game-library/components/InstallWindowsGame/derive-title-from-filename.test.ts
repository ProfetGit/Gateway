import { describe, it, expect } from 'vitest'
import { deriveTitleFromFilename } from './derive-title-from-filename'

describe('deriveTitleFromFilename', () => {
    it.each([
        ['/d/setup_hades_2.0.5.exe', 'Hades'],
        ['/d/setup_the_witcher_3_wild_hunt_1.32.exe', 'The Witcher 3 Wild Hunt'],
        ['/d/Stardew Valley Installer.exe', 'Stardew Valley'],
        ['/d/setup_disco_elysium_(64bit)_1.0.exe', 'Disco Elysium'],
        ['/d/DOOM.exe', 'DOOM'],
        ['/d/hollow_knight_win64_setup.msi', 'Hollow Knight'],
        ['/d/setup_baldurs_gate_2.5.26.6-(gog).exe', 'Baldurs Gate'],
    ] as const)('%s -> %s', (path, expected) => {
        expect(deriveTitleFromFilename(path)).toBe(expected)
    })

    // The name is a prefill the user can edit, so a bad guess is far better
    // than an empty box.
    it('falls back to the raw stem when cleaning removes everything', () => {
        expect(deriveTitleFromFilename('/d/setup.exe')).toBe('Setup')
    })

    it('handles a bare filename with no directory', () => {
        expect(deriveTitleFromFilename('Hades.exe')).toBe('Hades')
    })

    it('leaves existing capitalisation alone', () => {
        expect(deriveTitleFromFilename('/d/FTL.exe')).toBe('FTL')
    })
})
