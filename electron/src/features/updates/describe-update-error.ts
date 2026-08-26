// ═══════════════════════════════════════════════════════════
// Turning an updater failure into something a player can read
// ═══════════════════════════════════════════════════════════
//
// electron-updater's errors carry the entire HTTP exchange in `message` —
// status line, every response header, and GitHub's `Set-Cookie` values. That
// went straight into the Settings panel, which meant a wall of raw headers
// with session cookies in it where a sentence belonged. Nothing about a failed
// update check is the user's problem to debug, so the detail belongs in the
// console and only the outcome belongs on screen.
//
// Pure: no Electron, no network.

/** Longest raw message we will ever surface, if nothing else matches. */
const MAX_MESSAGE_LENGTH = 140

interface ErrorRule {
    test: RegExp
    message: string
}

const RULES: ErrorRule[] = [
    // The updater's own wording for a 404 on releases.atom. It means the feed
    // isn't reachable: no published release yet, or a private repository that
    // an unauthenticated app cannot read.
    {
        test: /404|Cannot find latest|No published versions|releases\.atom/i,
        message: 'No update is published yet.',
    },
    {
        test: /ENOTFOUND|EAI_AGAIN|ENETUNREACH|ECONNREFUSED|ETIMEDOUT|network|getaddrinfo/i,
        message: "Couldn't reach the update server. Check your connection and try again.",
    },
    {
        test: /EACCES|EPERM|read-?only|permission denied/i,
        message: "Gateway can't write to its own file, so it can't update itself. Move it somewhere you own, like your home folder.",
    },
    {
        test: /is not packaged|APPIMAGE/i,
        message: 'Updates only run in the installed app.',
    },
    {
        test: /\b(401|403)\b|authentication|unauthorized|forbidden/i,
        message: "The update server refused the request. This build can't check for updates.",
    },
    {
        test: /\b5\d\d\b|service unavailable|bad gateway/i,
        message: 'The update server is having trouble. Try again later.',
    },
]

/**
 * A single sentence for the UI. The raw error is never returned — it is logged
 * by the caller instead.
 */
export function describeUpdateError(error: unknown): string {
    const raw = error instanceof Error ? error.message : String(error ?? '')

    for (const rule of RULES) {
        if (rule.test.test(raw)) return rule.message
    }

    // Unmatched: keep the first line only, and cap it. A multi-line message is
    // always an HTTP dump, never a sentence worth showing.
    const firstLine = raw.split('\n')[0]?.trim() ?? ''
    if (firstLine.length === 0) return 'Something went wrong checking for updates.'
    return firstLine.length > MAX_MESSAGE_LENGTH
        ? 'Something went wrong checking for updates.'
        : firstLine
}
