// ═══════════════════════════════════════════════════════════
// Picking the game out of a Wine prefix
// ═══════════════════════════════════════════════════════════
//
// An installer drops the game plus a uninstaller plus whatever redistributable
// bundles it carries. Ranking what it left behind is the difference between
// "here is your game" and "here are 40 .exe files, good luck" — which is what
// every other launcher makes you do by hand.
//
// Pure: paths and sizes in, ranking out. No fs.

export interface ExecutableCandidate {
    path: string
    size: number
}

export interface RankedExecutable extends ExecutableCandidate {
    name: string
    score: number
}

/**
 * Never the game. Matched against the file name only.
 *
 * `setup` and `install` are here because an installer commonly copies itself
 * into the install directory, and it would otherwise win on size.
 */
export const EXCLUDED_NAMES = [
    /^unins/,
    /uninstall/,
    /^setup/,
    /^install/,
    /vcredist/,
    /vc_redist/,
    /^dxsetup/,
    /^dxwebsetup/,
    /^dotnet/,
    /^ndp\d/,
    /^directx/,
    /^oalinst/,
    /crashhandler/,
    /crashpad/,
    /^unitycrash/,
    /^ue4prereqsetup/,
    /^easyanticheat_setup/,
    /^vulkanrt/,
    /^python-?\d/,
]

/** Never the game. Matched against the directory the file sits in. */
export const EXCLUDED_DIRS = [
    /(^|\/)windows\//,
    /(^|\/)program files[^/]*\/common files\//,
    /(^|\/)_?redist(ributable)?s?\//,
    /(^|\/)_commonredist\//,
    /(^|\/)directx\//,
    /(^|\/)dotnet\//,
    /(^|\/)vcredist\//,
    /(^|\/)prerequisites?\//,
    /(^|\/)\$recycle\.bin\//,
]

/** Directories a real game usually lands in. */
const PREFERRED_DIRS = [
    /(^|\/)program files[^/]*\//,
    /(^|\/)gog games\//,
    /(^|\/)games\//,
]

export function normalizeName(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '')
}

/** Path below drive_c, lowercased, forward-slashed. Falls back to the whole path. */
export function relativeToDriveC(fullPath: string): string {
    const lower = fullPath.toLowerCase().replace(/\\/g, '/')
    const marker = '/drive_c/'
    const index = lower.indexOf(marker)
    return index === -1 ? lower.replace(/^\//, '') : lower.slice(index + marker.length)
}

export function fileName(fullPath: string): string {
    return fullPath.replace(/\\/g, '/').split('/').pop() ?? fullPath
}

export function isExcluded(fullPath: string): boolean {
    const relative = relativeToDriveC(fullPath)
    const name = fileName(relative)
    const dir = relative.slice(0, relative.length - name.length)
    return EXCLUDED_NAMES.some((r) => r.test(name)) || EXCLUDED_DIRS.some((r) => r.test(dir))
}

function scoreCandidate(candidate: ExecutableCandidate, title: string): number {
    const relative = relativeToDriveC(candidate.path)
    const name = fileName(relative)
    const stem = normalizeName(name.replace(/\.[^.]+$/, ''))
    const parent = normalizeName(relative.split('/').slice(-2, -1)[0] ?? '')
    const wanted = normalizeName(title)

    let score = 0

    // Name match is the strongest signal there is.
    if (wanted && stem === wanted) score += 100
    else if (wanted.length >= 3 && stem.length >= 3 && (stem.includes(wanted) || wanted.includes(stem))) score += 50

    if (wanted && parent === wanted) score += 40
    else if (wanted.length >= 3 && parent.length >= 3 && (parent.includes(wanted) || wanted.includes(parent))) score += 20

    // The biggest binary in a game folder is almost always the game.
    score += Math.min(25, Math.round(Math.log10(Math.max(candidate.size, 1)) * 4))

    if (PREFERRED_DIRS.some((r) => r.test(`/${relative}`))) score += 10
    if (name.endsWith('.exe')) score += 5

    // Deeply buried binaries are usually engine tooling, not the entry point.
    score -= Math.max(0, relative.split('/').length - 3) * 2

    return score
}

/**
 * Rank what an installer produced, best first. Excluded files are dropped
 * entirely rather than ranked low — showing `unins000.exe` at the bottom of
 * the list still invites picking it.
 */
export function rankGameExecutables(
    candidates: ExecutableCandidate[],
    title: string
): RankedExecutable[] {
    return candidates
        .filter((c) => !isExcluded(c.path))
        .map((c) => ({ ...c, name: fileName(c.path), score: scoreCandidate(c, title) }))
        .sort((a, b) =>
            b.score - a.score
            || b.size - a.size
            || a.path.length - b.path.length
            || a.path.localeCompare(b.path)
        )
}
