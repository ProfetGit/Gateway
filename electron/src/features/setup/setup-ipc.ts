import { ipcMain, BrowserWindow } from 'electron'
import { JsonStore } from '../../shared/store'
import { setSteamApiKey, getAuthState, enrichUserWithApiKey } from '../../../steamAuth'

export interface SetupState {
    hasCompletedSetup: boolean
    hasApiKey: boolean
    isSteamLoggedIn: boolean
    hasGames: boolean
}

export function setupSetupHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    // Get current setup state — used by renderer to decide whether to auto-open
    // the wizard on first launch, and to render per-card status badges.
    ipcMain.handle('get_setup_state', (): SetupState => {
        const settings = store.get('settings')
        const auth = getAuthState()
        const games = store.get('games') ?? []
        return {
            hasCompletedSetup: !!settings?.hasCompletedSetup,
            hasApiKey: !!settings?.steamApiKey,
            isSteamLoggedIn: !!auth?.isLoggedIn,
            hasGames: games.length > 0,
        }
    })

    // Persist setup completion. Idempotent.
    ipcMain.handle('mark_setup_complete', () => {
        const settings = store.get('settings') ?? { steamPath: '' }
        store.set('settings', { ...settings, hasCompletedSetup: true })
    })

    // Save Steam Web API key. Validates it against the logged-in user's
    // profile visibility (matches the Tauri backend), and backfills the
    // user's avatar if the OpenID scrape came back empty.
    ipcMain.handle('set_steam_api_key', async (_event, { key }: { key: string }) => {
        const trimmed = (key ?? '').trim()

        if (!trimmed) {
            const settings = store.get('settings') ?? { steamPath: '' }
            store.set('settings', { ...settings, steamApiKey: undefined })
            setSteamApiKey('')
            return { success: true, hasKey: false }
        }

        const auth = getAuthState()
        if (auth.isLoggedIn && auth.user) {
            try {
                const url = `https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v2/?key=${trimmed}&steamids=${auth.user.steamId}`
                const res = await fetch(url)
                if (!res.ok) {
                    return { success: false, hasKey: false, error: 'Invalid API key' }
                }
                const data = await res.json()
                const player = data?.response?.players?.[0]
                const visibility = player?.communityvisibilitystate ?? 0
                if (visibility !== 3) {
                    return {
                        success: false,
                        hasKey: false,
                        error: 'Your Steam profile is set to private. Set Game details to Public in Steam privacy settings.',
                    }
                }
                if (!auth.user.avatarUrl) {
                    const enriched = await enrichUserWithApiKey(auth.user.steamId, trimmed)
                    if (enriched) {
                        const newAuth = { isLoggedIn: true, user: enriched }
                        store.set('steamAuth', newAuth)
                        getMainWindow()?.webContents.send('auth-state-updated', newAuth)
                    }
                }
            } catch {
                // Network error — save the key anyway.
            }
        }

        const settings = store.get('settings') ?? { steamPath: '' }
        store.set('settings', { ...settings, steamApiKey: trimmed })
        setSteamApiKey(trimmed)
        return { success: true, hasKey: true }
    })

    // Read back current key for prefilling the Settings input.
    ipcMain.handle('get_steam_api_key', (): string => {
        const settings = store.get('settings')
        return settings?.steamApiKey ?? ''
    })
}
