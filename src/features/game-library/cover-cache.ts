// Covers this session has already fetched, decoded and measured.
//
// Two jobs. The preloader reads it to skip work and to know whether to fall
// through to the next candidate URL. GameCard reads it at mount to decide
// whether to fade the cover in at all — the fade exists to cover a network
// wait, and playing it over an image that is already in memory is exactly the
// pop-in it was meant to hide.
//
// Keyed by URL, so a resync that repoints a game at a freshly mirrored cover
// invalidates itself: the new URL simply isn't in here.

// Matches MAX_COVER_ASPECT in electron/src/shared/image-file.ts. The mirror
// refuses to store a banner as a cover, but a remote fallback URL can still
// resolve to one — Steam serves header.jpg for any app with no library art.
// A wide image in a 3:4 slot renders as a stretched crop, which is worse than
// the designed no-cover tile.
export const MAX_COVER_ASPECT = 1.2

/** Loaded, and cover-shaped. A banner is a successful fetch and a failed cover. */
const ready = new Set<string>()

/** Every URL we have started. Failures stay in here so a 404 is tried once,
 *  not again on every scroll that brings the card back into range. */
const attempted = new Set<string>()

// Browsers cap connections per host anyway; the point of the gate is to keep
// the far end of the preload window from competing with the cards on screen.
const MAX_PARALLEL = 6
let active = 0
const waiting: (() => void)[] = []

export function isCoverReady(src: string | undefined): boolean {
    return !!src && ready.has(src)
}

/** Tried and no good — a 404, or an image that came back banner-shaped. Lets a
 *  card skip straight past a candidate the preloader already ruled out instead
 *  of replaying the whole fallback chain on screen. */
export function isCoverFailed(src: string | undefined): boolean {
    return !!src && attempted.has(src) && !ready.has(src)
}

/** Record a cover the card itself loaded, so a later remount doesn't refade it. */
export function markCoverReady(src: string | undefined): void {
    if (src) {
        ready.add(src)
        attempted.add(src)
    }
}

function load(src: string, done: () => void): void {
    active++
    const img = new Image()

    const finish = () => {
        active--
        waiting.shift()?.()
        done()
    }

    img.onload = () => {
        const { naturalWidth, naturalHeight } = img
        if (naturalHeight > 0 && naturalWidth / naturalHeight <= MAX_COVER_ASPECT) {
            ready.add(src)
        }
        finish()
    }
    img.onerror = finish
    img.decoding = 'async'
    img.src = src
}

/** Fetch a cover into the browser cache. Resolves whether or not it worked —
 *  callers check `isCoverReady` to decide if the next candidate is needed. */
export function preloadCover(src: string | undefined): Promise<void> {
    if (!src || attempted.has(src)) return Promise.resolve()
    attempted.add(src)

    return new Promise<void>((resolve) => {
        if (active < MAX_PARALLEL) load(src, resolve)
        else waiting.push(() => load(src, resolve))
    })
}
