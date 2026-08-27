import path from 'node:path'

/** Roots a wine prefix may legitimately live under. */
const ALLOWED_ROOTS = ['/mnt', '/media', '/run/media', '/tmp', '/var/tmp']

/** Minimum path segments below the anchor, so `/mnt/games` itself is never a target. */
const MIN_DEPTH = 2

export interface ResetPrefixGuardInput {
    prefixPath: string
    homeDir: string
}

/**
 * Whether a directory is safe to delete as a wine prefix.
 *
 * Retrying an install with a different Proton needs a clean prefix — wine
 * refuses to reuse a prefix built by a newer version, so a retry without this
 * fails for a reason that has nothing to do with the game. That makes deletion
 * necessary, which makes these guards necessary: the path arrives from the
 * renderer, and the user can type any folder they like into the picker.
 */
export function canResetPrefix({ prefixPath, homeDir }: ResetPrefixGuardInput): boolean {
    if (!prefixPath || !path.isAbsolute(prefixPath)) return false

    const target = path.normalize(prefixPath).replace(/\/+$/, '')
    const home = path.normalize(homeDir).replace(/\/+$/, '')

    if (target === '/' || target === home) return false
    // `..` anywhere means the string cannot be reasoned about by prefix alone.
    if (target.split('/').includes('..')) return false

    const anchors = [home, ...ALLOWED_ROOTS]
    const anchor = anchors.find((root) => target === root || target.startsWith(`${root}/`))
    if (!anchor || target === anchor) return false

    const depth = target.slice(anchor.length).split('/').filter(Boolean).length
    return depth >= MIN_DEPTH
}
