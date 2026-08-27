import type { Game } from './game-library-types'
import { getMetadataAppId } from './get-metadata-app-id'
import { isCoverFailed, isCoverReady } from './cover-cache'

const STEAM_CDN = 'https://steamcdn-a.akamaihd.net/steam/apps'

// The grid draws covers at roughly 205x274, but mirrors them at source size —
// 600x900, sometimes 3 MB. Decoding one bitmap per card at nine times the area
// it is drawn at cost 243 MB of decoded pixels across a single scroll through
// a 465-game library. `gateway://thumb/` serves a 450px-wide copy of the same
// file, and falls back to the original when no thumbnail exists yet, so this
// needs nothing stored on the game.
//
// Read once: display density doesn't change under a running window, and making
// this reactive would re-render every mounted card. Above 1.5x the thumbnail
// would be the softer choice, so those displays keep the original — the detail
// view always does, at any density.
const COVER_DIR = typeof window !== 'undefined' && window.devicePixelRatio > 1.5 ? 'cover' : 'thumb'

/**
 * Every URL that could serve this game's cover, best first.
 *
 * One list, two consumers: GameCard walks it on `<img>` error, the preloader
 * warms it ahead of the scroll. They used to resolve URLs separately, and the
 * preloader's version knew nothing about the Steam CDN guesses — so every game
 * without a mirrored cover was guaranteed to pop in no matter how early it was
 * warmed. Keep this the only place a cover URL is built.
 */
export function coverSources(game: Game): string[] {
    const appId = getMetadataAppId(game)
    const sources: string[] = []

    if (game.localCoverPath) sources.push(`gateway://${COVER_DIR}/${game.localCoverPath}`)
    if (game.coverUrl) sources.push(game.coverUrl)
    if (appId) {
        sources.push(`${STEAM_CDN}/${appId}/library_600x900_2x.jpg`)
        sources.push(`${STEAM_CDN}/${appId}/library_600x900.jpg`)
        sources.push(`${STEAM_CDN}/${appId}/header.jpg`)
    }

    return sources
}

/**
 * The source a card should mount with.
 *
 * First choice is one already decoded and known cover-shaped. Failing that,
 * the best candidate the preloader has NOT already ruled out — mounting on a
 * URL known to 404 just replays the fallback chain on screen, one visible
 * flicker per step, when the answer was already known off-screen.
 */
export function initialCoverSource(game: Game): string | undefined {
    const sources = coverSources(game)
    return sources.find(isCoverReady) ?? sources.find((src) => !isCoverFailed(src)) ?? sources[0]
}

/** The next candidate after one that failed, or undefined when exhausted. */
export function nextCoverSource(game: Game, current: string | undefined): string | undefined {
    const sources = coverSources(game)
    const index = current ? sources.indexOf(current) : -1
    return index < 0 ? undefined : sources[index + 1]
}
