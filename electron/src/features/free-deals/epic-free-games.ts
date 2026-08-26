import { parseEpicFreeGames, type EpicFreeGame } from './epic-free-games-parser'

// Epic's own backing endpoint for the store's "Free Games" row. Unauthenticated
// and CORS-free from the main process. `country`/`allowCountries` only affect
// the currency the prices come back in — the giveaway lineup is the same
// worldwide, so this stays pinned to US rather than guessing the user's region
// and risking an empty response from an unsupported one.
const EPIC_FREE_GAMES_URL =
    'https://store-site-backend-static.ak.epicgames.com/freeGamesPromotions?locale=en-US&country=US&allowCountries=US'

const REQUEST_TIMEOUT_MS = 15_000

export async function fetchEpicFreeGames(now: Date = new Date()): Promise<EpicFreeGame[]> {
    const response = await fetch(EPIC_FREE_GAMES_URL, {
        headers: { Accept: 'application/json' },
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    })
    if (!response.ok) {
        throw new Error(`Epic free games API returned ${response.status}`)
    }
    return parseEpicFreeGames(await response.json(), now)
}
