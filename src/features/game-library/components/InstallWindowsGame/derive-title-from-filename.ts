// Installer file names are close to a title but never quite one:
// `setup_hades_2.0.5_(64bit).exe`. Getting this roughly right is the
// difference between the user accepting the prefilled name and retyping it.

const NOISE_WORDS = [
    'setup',
    'install',
    'installer',
    'gog',
    'repack',
    'multi\\d*',
    'win(dows)?(32|64)?',
    '(x|amd)?64bit',
    '(x|amd)?32bit',
    'x64',
    'x86',
    'full',
    'final',
]

const NOISE = new RegExp(`\\b(${NOISE_WORDS.join('|')})\\b`, 'gi')
// 2.0.5 / v1.3 / (1.02) — a version, not part of the name.
const VERSION = /\bv?\d+(\.\d+)+[a-z]?\b/gi

export function deriveTitleFromFilename(filePath: string): string {
    const base = (filePath.split('/').pop() ?? filePath).replace(/\.(exe|msi|bat|sh|appimage)$/i, '')

    // Order matters: underscores become spaces first so a version has a word
    // boundary in front of it, but dots stay until after VERSION has run, or
    // `2.0.5` is already three separate numbers by the time we look.
    const cleaned = base
        .replace(/_+/g, ' ')
        .replace(VERSION, ' ')
        .replace(/[.]+/g, ' ')
        .replace(/[[\]()]/g, ' ')
        .replace(NOISE, ' ')
        .replace(/\s*-\s*/g, ' ')
        .replace(/\s+/g, ' ')
        .trim()

    // If cleaning ate everything, the raw stem is a better guess than nothing.
    const result = cleaned || base.replace(/[_.]+/g, ' ').replace(/\s+/g, ' ').trim()

    return result.replace(/\b[a-z]/g, (c) => c.toUpperCase())
}
