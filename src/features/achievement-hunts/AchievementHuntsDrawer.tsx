import React from 'react'
import { AchievementsSurface } from '@/features/achievements/AchievementsSurface'
import type { AchievementGameSummary } from '@/features/achievements/achievements-surface-types'
import { useGameStore } from '@/features/game-library/game-store'
import { useAchievementsStore } from './achievements-store'

/**
 * Hunts mode of the shared achievements surface: the same shell, listing games
 * instead of achievements. Picking one closes the drawer and opens that game's
 * detail, which is where its own achievements live.
 *
 * Only in-progress games qualify. A 0% game is not a hunt, and a finished one
 * has nothing left to chase — both would just pad the list.
 */
export function AchievementHuntsDrawer() {
    const libraryGames = useGameStore((s) => s.games)
    const openDetail = useGameStore((s) => s.openDetail)
    const isOpen = useGameStore((s) => s.isHuntsDrawerOpen)
    const onClose = useGameStore((s) => s.closeHuntsDrawer)
    const progressMap = useAchievementsStore((s) => s.progress)

    const games = React.useMemo<AchievementGameSummary[]>(() => {
        const rows: AchievementGameSummary[] = []
        for (const game of libraryGames) {
            if (!game.steamAppId) continue
            const progress = progressMap[game.steamAppId]
            if (!progress || progress.total === 0) continue
            if (progress.unlocked >= progress.total) continue
            rows.push({
                id: game.id,
                title: game.title,
                coverSrc: game.localCoverPath ? `gateway://cover/${game.localCoverPath}` : game.coverUrl,
                unlocked: progress.unlocked,
                total: progress.total,
                percentage: progress.percentage,
            })
        }
        return rows.sort((a, b) => b.percentage - a.percentage)
    }, [libraryGames, progressMap])

    const totals = React.useMemo(
        () => games.reduce(
            (acc, g) => ({ unlocked: acc.unlocked + g.unlocked, total: acc.total + g.total }),
            { unlocked: 0, total: 0 }
        ),
        [games]
    )

    const handleSelect = (id: string) => {
        const game = libraryGames.find((g) => g.id === id)
        if (!game) return
        onClose()
        openDetail(game)
    }

    return (
        <AchievementsSurface
            isOpen={isOpen}
            onClose={onClose}
            title="Achievement Hunts"
            games={games}
            unlocked={totals.unlocked}
            total={totals.total}
            emptyMessage="No hunts in progress"
            onSelectGame={handleSelect}
        />
    )
}
