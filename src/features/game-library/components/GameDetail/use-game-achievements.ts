import { useState, useRef, useEffect, useMemo, useCallback } from 'react'
import { getAchievements } from '@/features/achievements/api/get-achievements'
import { getAchievementDefinitions } from '@/features/achievements/api/get-achievement-definitions'
import { mergeManualAchievements } from '@/features/achievements/merge-manual-achievements'
import type { FetchAchievementsResult } from '@/features/achievements/api/achievements-schema'
import type { AchievementDefinition } from '@/features/achievements/api/achievement-definitions-schema'
import { notifyAchievementUnlock, notifyGameCompleted } from '@/features/achievements/notify-achievement-unlock'
import { useToastStore } from '@/components/ui/toast/toast-store'
import { getMetadataAppId, isManuallyTracked } from '@/features/game-library/get-metadata-app-id'
import { updateGame as apiUpdateGame } from '@/features/game-library/api/update-game'
import { useGameStore } from '@/features/game-library/game-store'
import type { Game } from '@/features/game-library/game-library-types'

const EMPTY_RESULT: FetchAchievementsResult = {
    success: false,
    achievements: [],
    totalAchievements: 0,
    unlockedCount: 0,
}

interface UseGameAchievementsResult {
    achievementsData: FetchAchievementsResult | null
    achievementsLoading: boolean
    /** Only set for manually-tracked games; undefined means the list is read-only. */
    toggleAchievement?: (apiname: string) => void
    isManual: boolean
}

/**
 * Achievements for the detail overlay.
 *
 * Two distinct paths. For games the user owns on Steam we ask Steam what the
 * player unlocked. For games only *matched* to Steam, Steam will describe the
 * achievements but refuses to report progress for a game you don't own — so we
 * fetch the definitions and merge in unlocks the user recorded by hand.
 */
export function useGameAchievements(selectedGame: Game | null, activeTab: string): UseGameAchievementsResult {
    const [steamData, setSteamData] = useState<FetchAchievementsResult | null>(null)
    const [definitions, setDefinitions] = useState<AchievementDefinition[] | null>(null)
    const [definitionsMeta, setDefinitionsMeta] = useState<{ gameName?: string; error?: string } | null>(null)
    const [isLoading, setIsLoading] = useState(false)
    const fetchedRef = useRef<string | null>(null)

    const updateGameInStore = useGameStore((s) => s.updateGame)

    const isManual = isManuallyTracked(selectedGame)
    const appId = getMetadataAppId(selectedGame)
    const gameId = selectedGame?.id
    const gameTitle = selectedGame?.title
    const manualUnlocks = selectedGame?.manualUnlocks

    useEffect(() => {
        setSteamData(null)
        setDefinitions(null)
        setDefinitionsMeta(null)
        fetchedRef.current = null
    }, [gameId])

    useEffect(() => {
        if (activeTab !== 'achievements' || !appId) return
        if (fetchedRef.current === appId) return

        fetchedRef.current = appId
        setIsLoading(true)

        const request = isManual
            ? getAchievementDefinitions(appId)
                .then((result) => {
                    setDefinitions(result.definitions)
                    setDefinitionsMeta({ gameName: result.gameName, error: result.success ? undefined : result.error })
                })
                .catch(() => {
                    setDefinitions([])
                    setDefinitionsMeta({ error: "Couldn't load achievements" })
                })
            : getAchievements(appId)
                .then(setSteamData)
                .catch(() => setSteamData(EMPTY_RESULT))

        request.finally(() => setIsLoading(false))
    }, [activeTab, appId, isManual])

    const achievementsData = useMemo(() => {
        if (!isManual) return steamData
        if (!definitions) return null
        if (definitionsMeta?.error) {
            return { ...EMPTY_RESULT, error: definitionsMeta.error }
        }
        return mergeManualAchievements(definitions, manualUnlocks ?? {}, definitionsMeta?.gameName)
    }, [isManual, steamData, definitions, definitionsMeta, manualUnlocks])

    const toggleAchievement = useCallback((apiname: string) => {
        if (!gameId) return

        const current = manualUnlocks ?? {}
        const isUnlocking = current[apiname] === undefined
        const next = { ...current }
        if (isUnlocking) {
            next[apiname] = Math.floor(Date.now() / 1000)
        } else {
            delete next[apiname]
        }

        const persist = (value: Record<string, number>, rollback: Record<string, number>) => {
            // Optimistic — update_game does not emit games-updated. The whole map
            // goes over the wire because update_game does a shallow merge.
            updateGameInStore(gameId, { manualUnlocks: value })
            apiUpdateGame(gameId, { manualUnlocks: value }).catch((err) => {
                console.error('Failed to save achievement progress:', err)
                updateGameInStore(gameId, { manualUnlocks: rollback })
                useToastStore.getState().push({
                    variant: 'info',
                    title: "Couldn't save that",
                    message: "Your change didn't stick. Try again.",
                })
            })
        }

        persist(next, current)

        if (!isUnlocking) return

        const definition = definitions?.find((d) => d.apiname === apiname)
        const total = definitions?.length ?? 0
        const unlockedCount = Object.keys(next).filter(
            (key) => definitions?.some((d) => d.apiname === key),
        ).length

        // Fire on the transition only, so re-toggling a locked one doesn't
        // re-announce and completion announces exactly once.
        if (total > 0 && unlockedCount === total) {
            notifyGameCompleted({ gameTitle: gameTitle ?? 'This game', total })
        } else {
            notifyAchievementUnlock({
                achievementName: definition?.name ?? apiname,
                gameTitle: gameTitle ?? '',
                iconUrl: definition?.icon,
                onUndo: () => persist(current, next),
            })
        }
    }, [gameId, gameTitle, manualUnlocks, definitions, updateGameInStore])

    return {
        achievementsData,
        achievementsLoading: isLoading,
        toggleAchievement: isManual ? toggleAchievement : undefined,
        isManual,
    }
}
