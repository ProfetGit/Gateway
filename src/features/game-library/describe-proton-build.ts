import type { ProtonBuild } from './api/launch-schema'

export interface ProtonChoice {
    /** '' means "let umu fetch the latest UMU-Proton", the default. */
    path: string
    label: string
    blurb: string
}

/**
 * Turns a build directory name into something a person can choose between.
 *
 * Nobody outside this hobby can rank `GE-Proton11-5-x86_64` against
 * `proton-cachyos-slr`, so the retry list says what each one is FOR rather
 * than what it is called. Order is by how often each one rescues an installer
 * the default could not run.
 */
export function describeProtonBuild(build: ProtonBuild): ProtonChoice & { rank: number } {
    const name = build.name.toLowerCase()

    if (name.includes('cachyos')) {
        return {
            path: build.path,
            label: 'Proton CachyOS',
            blurb: 'Tuned for this system. A good second try.',
            rank: 1,
        }
    }
    if (name.startsWith('ge-proton') || name.includes('ge-proton')) {
        return {
            path: build.path,
            label: `Proton GE ${extractVersion(build.name) ?? ''}`.trim(),
            blurb: 'Community build with extra fixes for awkward installers.',
            rank: 0,
        }
    }
    if (name.includes('umu-proton')) {
        return {
            path: build.path,
            label: `Standard Proton ${extractVersion(build.name) ?? ''}`.trim(),
            blurb: 'A fixed version of what Gateway normally downloads.',
            rank: 3,
        }
    }
    if (name.includes('experimental')) {
        return { path: build.path, label: 'Proton Experimental', blurb: "Valve's test build.", rank: 4 }
    }
    return {
        path: build.path,
        label: build.name,
        blurb: 'Another version installed on this system.',
        rank: 5,
    }
}

function extractVersion(name: string): string | null {
    return name.match(/\d+[\d.-]*\d/)?.[0] ?? null
}

const DEFAULT_CHOICE: ProtonChoice = {
    path: '',
    label: 'The latest Proton',
    blurb: 'Downloaded automatically. The usual default.',
}

/**
 * The retry list: every installed build the failed attempt did NOT use, most
 * promising first, plus the automatic default when that was not what ran.
 */
export function protonRetryChoices(builds: ProtonBuild[], usedPath: string, limit = 3): ProtonChoice[] {
    const described = builds
        .filter((build) => build.path !== usedPath)
        .map(describeProtonBuild)
        .sort((a, b) => a.rank - b.rank)
        .map((described): ProtonChoice => ({ path: described.path, label: described.label, blurb: described.blurb }))

    const withDefault = usedPath === '' ? described : [...described, DEFAULT_CHOICE]
    return withDefault.slice(0, limit)
}
