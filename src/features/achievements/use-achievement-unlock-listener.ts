import { useEffect } from 'react'
import { onAchievementsUnlocked } from './api/on-achievements-unlocked'
import { getAchievementDefinitions } from './api/get-achievement-definitions'
import { notifyAchievementUnlock, notifyGameCompleted, notifyAchievementBurst } from './notify-achievement-unlock'

// Above this many unlocks in one event, show one summary toast instead of one
// per achievement — a real backlog catch-up can be dozens at once.
const BURST_THRESHOLD = 4
import { useGameStore } from '@/features/game-library/game-store'
import { getMetadataAppId } from '@/features/game-library/get-metadata-app-id'

/**
 * Surfaces unlocks the main process detected on disk.
 *
 * The watcher only knows apiname + timestamp, so display names and icons are
 * resolved here against the cached definitions (the main process serves those
 * from a 24h cache, so this is cheap).
 */
export function useAchievementUnlockListener() {
    useEffect(() => {
        let unlisten: (() => void) | undefined

        onAchievementsUnlocked(async ({ gameId, gameTitle, unlocked, totalUnlocked }) => {
            if (unlocked.length === 0) return

            const game = useGameStore.getState().games.find((g) => g.id === gameId)
            const appId = getMetadataAppId(game)

            let definitions: Awaited<ReturnType<typeof getAchievementDefinitions>>['definitions'] = []
            if (appId) {
                try {
                    definitions = (await getAchievementDefinitions(appId)).definitions
                } catch {
                    // Fall through — announce with the raw apiname rather than stay silent.
                }
            }

            const total = definitions.length
            if (total > 0 && totalUnlocked >= total) {
                notifyGameCompleted({ gameTitle, total })
                return
            }

            if (unlocked.length > BURST_THRESHOLD) {
                notifyAchievementBurst(gameTitle, unlocked.length)
                return
            }

            for (const entry of unlocked) {
                const def = definitions.find((d) => d.apiname === entry.apiname)
                notifyAchievementUnlock({
                    achievementName: def?.name ?? entry.apiname,
                    gameTitle,
                    iconUrl: def?.icon,
                })
            }
        }).then((fn) => { unlisten = fn })

        return () => { unlisten?.() }
    }, [])
}
