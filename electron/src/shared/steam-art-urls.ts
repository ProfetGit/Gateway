// ═══════════════════════════════════════════════════════════
// Steam cover art URL resolution
// ═══════════════════════════════════════════════════════════
//
// There is no single URL that works for every app:
//
//  - Most games have library_600x900_2x.jpg.
//  - Multiplayer/component apps (Black Ops II - Multiplayer, 202990) have no
//    library art at all, only header.jpg.
//  - Newer apps (Waterpark Simulator, 3293260) keep their assets behind a
//    content-hashed path that cannot be guessed — only the appdetails API
//    knows it, and for those even header.jpg 404s at the plain path.
//
// So: guess the cheap URLs first, then ask the API.

const CDN_HOST = 'https://cdn.cloudflare.steamstatic.com/steam/apps'

/** Guessable paths, best art first. */
export function steamCoverGuesses(appId: string): string[] {
    return [
        `${CDN_HOST}/${appId}/library_600x900_2x.jpg`,
        `${CDN_HOST}/${appId}/library_600x900.jpg`,
        `${CDN_HOST}/${appId}/header.jpg`,
    ]
}

/**
 * Wide hero art for the banner. `library_hero.jpg` is missing for plenty of
 * apps (multiplayer components have no library art at all), so header.jpg is
 * the fallback — wrong aspect ratio, but it renders.
 */
export function steamHeroGuesses(appId: string): string[] {
    return [
        `${CDN_HOST}/${appId}/library_hero_2x.jpg`,
        `${CDN_HOST}/${appId}/library_hero.jpg`,
        `${CDN_HOST}/${appId}/header.jpg`,
    ]
}

/** Transparent title logo. Decorative — the title text stands in when absent. */
export function steamLogoGuesses(appId: string): string[] {
    return [
        `${CDN_HOST}/${appId}/logo_2x.png`,
        `${CDN_HOST}/${appId}/logo.png`,
    ]
}

interface AppDetailsBasic {
    header_image?: string
    capsule_image?: string
}

/**
 * Ask Steam for the app's real art URLs. This is the only way to reach
 * content-hashed assets, so it is the last resort rather than the first.
 */
export async function fetchSteamArtUrls(appId: string): Promise<string[]> {
    try {
        const response = await fetch(
            `https://store.steampowered.com/api/appdetails?appids=${appId}&filters=basic`,
            {
                headers: { Accept: 'application/json' },
                signal: AbortSignal.timeout(15_000),
            }
        )
        if (!response.ok) return []

        const payload = await response.json() as Record<string, { success?: boolean; data?: AppDetailsBasic }>
        const data = payload[appId]?.success ? payload[appId]?.data : undefined
        if (!data) return []

        // capsule first: it is the closer aspect ratio to a cover.
        return [data.capsule_image, data.header_image].filter(
            (url): url is string => typeof url === 'string' && url.length > 0
        )
    } catch (error) {
        console.warn(`[Art] appdetails lookup failed for ${appId}:`, error)
        return []
    }
}
