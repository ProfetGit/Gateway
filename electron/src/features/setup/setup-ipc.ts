import { ipcMain } from 'electron'
import { JsonStore } from '../../shared/store'
import { setSteamApiKey, getAuthState } from '../../../steamAuth'

export interface SetupState {
    hasCompletedSetup: boolean
    hasApiKey: boolean
    isSteamLoggedIn: boolean
    hasGames: boolean
}

export function setupSetupHandlers(store: JsonStore) {
    // Get current setup state — used by renderer to decide whether to auto-open
    // the wizard on first launch, and to render per-card status badges.
    ipcMain.handle('get-setup-state', (): SetupState => {
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
    ipcMain.handle('mark-setup-complete', () => {
        const settings = store.get('settings') ?? { steamPath: '' }
        store.set('settings', { ...settings, hasCompletedSetup: true })
    })

    // Save Steam Web API key. Activates it for the current session immediately
    // so the user doesn't need to restart to get key-gated features working.
    ipcMain.handle('set-steam-api-key', (_event, key: string) => {
        const trimmed = (key ?? '').trim()
        const settings = store.get('settings') ?? { steamPath: '' }
        store.set('settings', { ...settings, steamApiKey: trimmed || undefined })
        setSteamApiKey(trimmed)
        return { success: true, hasKey: !!trimmed }
    })

    // Read back current key for prefilling the Settings input.
    ipcMain.handle('get-steam-api-key', (): string => {
        const settings = store.get('settings')
        return settings?.steamApiKey ?? ''
    })
}
