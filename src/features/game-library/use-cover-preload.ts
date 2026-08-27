import { useCallback, useEffect, useRef } from 'react'
import type { ListRange } from 'react-virtuoso'
import type { Game } from './game-library-types'
import { coverSources } from './game-cover-src'
import { isCoverReady, preloadCover } from './cover-cache'

// Cards of headroom to keep warm around what is rendered.
//
// Ahead is generous because that is where the user is going. Behind is small
// but not zero: scrolling back up unmounts and remounts those same cards, and
// a cover that was never cached pops in a second time.
const AHEAD = 60
const BEHIND = 20

/** Warm a game's cover, falling through the candidate list the same way the
 *  card will — a 404 or a banner here means the card would have fallen through
 *  on screen, which is the flicker we are trying to pre-empt. */
async function warmGame(game: Game): Promise<void> {
    for (const src of coverSources(game)) {
        await preloadCover(src)
        if (isCoverReady(src)) return
    }
}

/**
 * Preloads cover art around the grid's rendered range.
 *
 * This replaced a cursor in `game-store` that walked the *unfiltered* library
 * from index 0 at a fixed rate. It warmed the wrong images the moment a filter
 * or a sort was applied, and it never caught up with a fast scroll because the
 * cursor had no idea where the viewport was.
 *
 * Takes the same array the grid renders, so "ahead" always means ahead on screen.
 */
export function useCoverPreload(games: Game[]) {
    // Read through a ref: the grid hands us a range in a scroll callback, and
    // re-creating that callback on every library change would churn Virtuoso's
    // subscription for no gain.
    const gamesRef = useRef(games)
    gamesRef.current = games

    const warmAround = useCallback((range: ListRange) => {
        const list = gamesRef.current
        if (list.length === 0) return

        // Forward first — the preload queue is FIFO, so queueing order is
        // priority order, and what is about to scroll into view must not wait
        // behind what the user already scrolled past.
        const end = Math.min(list.length, range.endIndex + 1 + AHEAD)
        for (let i = range.startIndex; i < end; i++) {
            const game = list[i]
            if (game) void warmGame(game)
        }

        const start = Math.max(0, range.startIndex - BEHIND)
        for (let i = range.startIndex - 1; i >= start; i--) {
            const game = list[i]
            if (game) void warmGame(game)
        }
    }, [])

    // First paint, and after any filter/sort/resync: warm the top of the list
    // before Virtuoso has reported a range.
    useEffect(() => {
        warmAround({ startIndex: 0, endIndex: 0 })
    }, [games, warmAround])

    return warmAround
}
