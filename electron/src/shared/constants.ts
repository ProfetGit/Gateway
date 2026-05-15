// Steam Web API key — required for achievement progress, ownership checks,
// and "Owned" badges on trending cards. Trending, free deals, and local library
// scanning do NOT require a key.
//
// Get a key at https://steamcommunity.com/dev/apikey
// Set it via the STEAM_API_KEY environment variable, or enter it in the
// in-app Settings panel (stored in {userData}/gateway-data.json).
export const STEAM_API_KEY = process.env.STEAM_API_KEY || ''
