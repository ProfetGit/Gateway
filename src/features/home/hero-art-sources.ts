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

    if (game.steamAppId) {
        sources.push(`${CDN}/${game.steamAppId}/library_hero.jpg`)
    }
    if (game.heroImageUrl) sources.push(game.heroImageUrl)
    if (game.steamAppId) {
        sources.push(`${CDN}/${game.steamAppId}/header.jpg`)
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
    if (game.steamAppId) {
        sources.push(`${CDN}/${game.steamAppId}/library_600x900.jpg`)
        sources.push(`${CDN}/${game.steamAppId}/header.jpg`)
    }

    return sources
}

/** Logo is decorative — if none resolves, the title text stands in. */
export function logoArtSources(game: Game): string[] {
    const sources: string[] = []
    if (game.steamAppId) sources.push(`${CDN}/${game.steamAppId}/logo.png`)
    if (game.logoImageUrl) sources.push(game.logoImageUrl)
    return sources
}
