import { getMetadataAppId } from '@/features/game-library/get-metadata-app-id'
import type { Game } from '@/features/game-library/game-library-types'

const CDN = 'https://cdn.cloudflare.steamstatic.com/steam/apps'

/**
 * Ordered hero-art candidates, best first.
 *
 * A single URL is not enough: library_hero.jpg is missing for plenty of apps
 * (multiplayer components like Black Ops II - Multiplayer have no library art
 * at all), and with no fallback the banner rendered a broken-image icon.
 */
export function heroArtSources(game: Game): string[] {
    const sources: string[] = []
    // metadataAppId too: a manually added game matched to a Steam entry has
    // no steamAppId, and used to get no banner art at all.
    const appId = getMetadataAppId(game)

    if (appId) {
        sources.push(`${CDN}/${appId}/library_hero.jpg`)
    }
    if (game.heroImageUrl) sources.push(game.heroImageUrl)
    if (appId) {
        sources.push(`${CDN}/${appId}/header.jpg`)
    }
    // Mirrored local art is the most reliable thing we have — it was validated
    // as a real image before being written.
    if (game.localCoverPath) sources.push(`gateway://cover/${game.localCoverPath}`)
    if (game.coverUrl) sources.push(game.coverUrl)

    return sources
}

/**
 * Portrait art for the hero thumbnail strip. Prefers the locally mirrored
 * cover, which was validated as a real image before being written.
 */
export function thumbArtSources(game: Game): string[] {
    const sources: string[] = []

    if (game.localCoverPath) sources.push(`gateway://cover/${game.localCoverPath}`)
    if (game.coverUrl) sources.push(game.coverUrl)
    const appId = getMetadataAppId(game)
    if (appId) {
        sources.push(`${CDN}/${appId}/library_600x900.jpg`)
        sources.push(`${CDN}/${appId}/header.jpg`)
    }

    return sources
}

/** Logo is decorative — if none resolves, the title text stands in. */
export function logoArtSources(game: Game): string[] {
    const sources: string[] = []
    const appId = getMetadataAppId(game)
    if (appId) sources.push(`${CDN}/${appId}/logo.png`)
    if (game.logoImageUrl) sources.push(game.logoImageUrl)
    return sources
}
