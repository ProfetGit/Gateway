import os from 'node:os'
import path from 'node:path'

// ═══════════════════════════════════════════════════════════
// Launch defaults
// ═══════════════════════════════════════════════════════════
//
// These seed a NEW game's own values at creation time; they are never
// consulted at launch. So what the Properties panel shows for a game is
// exactly what runs, and changing a default later cannot silently alter how an
// existing game starts.

export interface LaunchSettings {
    prefixRoot?: string
    defaultProtonPath?: string
    defaultUseMangoHud?: boolean
    defaultUseGameMode?: boolean
}

/**
 * Prefixes go somewhere the user can find them. They are large (5-10 GB is
 * ordinary) and people need to point winetricks and file managers at them, so
 * a config directory is the wrong home.
 */
export function defaultPrefixRoot(): string {
    return path.join(os.homedir(), 'Games/Gateway/prefixes')
}

/** Filesystem-safe directory name for a game title. */
export function prefixSlug(title: string): string {
    const slug = title
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')  // combining marks left by NFKD
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/^-+|-+$/g, '')
        .slice(0, 64)
    return slug || 'game'
}

/** Normalised launch settings, with every default already applied. */
export function readLaunchSettings(settings: LaunchSettings): Required<Pick<LaunchSettings, 'prefixRoot' | 'defaultUseMangoHud' | 'defaultUseGameMode'>> & Pick<LaunchSettings, 'defaultProtonPath'> {
    return {
        prefixRoot: settings.prefixRoot || defaultPrefixRoot(),
        defaultProtonPath: settings.defaultProtonPath,
        defaultUseMangoHud: settings.defaultUseMangoHud ?? false,
        defaultUseGameMode: settings.defaultUseGameMode ?? false,
    }
}

export function prefixPathFor(root: string, title: string): string {
    return path.join(root, prefixSlug(title))
}
