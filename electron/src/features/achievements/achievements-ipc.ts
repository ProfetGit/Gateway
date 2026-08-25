import { ipcMain, BrowserWindow } from 'electron'
import path from 'node:path'
import { JsonStore } from '../../shared/store'
import { Game } from '../../shared/types'
import { fetchAchievementDefinitions, type FetchAchievementDefinitionsResult } from './steam-achievement-schema'
import { detectAchievementTracking } from './detect-achievement-tracking'
import { refreshAchievementWatchers } from './achievement-watcher'

// Definitions are effectively static per app, so this cache is much longer
// lived than the news/details ones.
const DEFINITIONS_CACHE_TTL = 24 * 60 * 60 * 1000

const definitionsCache = new Map<string, { data: FetchAchievementDefinitionsResult; fetchedAt: number }>()
const inFlight = new Map<string, Promise<FetchAchievementDefinitionsResult>>()

export function setupAchievementsHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    ipcMain.handle('get_achievement_definitions', async (_event, { appId }: { appId: string }) => {
        if (!appId) {
            return { success: false, appId: '', definitions: [], error: 'No game selected', errorCode: 'NO_SOURCE' }
        }

        const cached = definitionsCache.get(appId)
        if (cached && Date.now() - cached.fetchedAt < DEFINITIONS_CACHE_TTL) {
            return cached.data
        }

        // Share one request between concurrent callers, same as the trending feed.
        const existing = inFlight.get(appId)
        if (existing) return existing

        const request = fetchAchievementDefinitions(appId)
            .then((result) => {
                if (result.success) {
                    definitionsCache.set(appId, { data: result, fetchedAt: Date.now() })
                }
                return result
            })
            .finally(() => inFlight.delete(appId))

        inFlight.set(appId, request)
        return request
    })

    ipcMain.handle('get_achievement_tracking_status', async (_event, { gameId }: { gameId: string }) => {
        const game = store.get('games').find((g) => g.id === gameId) as Game | undefined
        if (!game) {
            return { summary: 'unknown' as const, flags: [], achievementFileHasProgress: false }
        }

        const gameDir = game.executablePath ? path.dirname(game.executablePath) : undefined
        return detectAchievementTracking({ winePrefix: game.winePrefix, gameDir })
    })

    // Re-runs watcher setup without an app restart — the natural next step
    // after a user edits a loader's config file themselves.
    ipcMain.handle('rescan_achievement_watchers', () => {
        refreshAchievementWatchers(store, getMainWindow())
        return { success: true }
    })
}
