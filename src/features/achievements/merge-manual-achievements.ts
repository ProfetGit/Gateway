import type { AchievementDefinition } from './api/achievement-definitions-schema'
import type { Achievement, FetchAchievementsResult } from './api/achievements-schema'

/**
 * Folds hand-tracked unlocks into the achievement list, producing the exact
 * same result shape Steam's own achievement fetch returns.
 *
 * That equivalence is deliberate: AchievementsTab, AchievementCard, and the
 * overview stat all keep working without knowing where the data came from.
 *
 * Sort order matches the Steam path — unlocked first (most recent first),
 * then locked alphabetically.
 */
export function mergeManualAchievements(
    definitions: AchievementDefinition[],
    unlocks: Record<string, number>,
    gameName?: string,
): FetchAchievementsResult {
    const achievements: Achievement[] = definitions.map((def) => {
        const unlocktime = unlocks[def.apiname]
        return {
            apiname: def.apiname,
            name: def.name,
            description: def.description,
            achieved: unlocktime !== undefined,
            unlocktime: unlocktime ?? 0,
            icon: def.icon,
            icongray: def.icongray,
            hidden: def.hidden,
            globalPercent: def.globalPercent,
        }
    })

    achievements.sort((a, b) => {
        if (a.achieved !== b.achieved) return a.achieved ? -1 : 1
        if (a.achieved && b.achieved) return b.unlocktime - a.unlocktime
        return a.name.localeCompare(b.name)
    })

    return {
        success: true,
        achievements,
        totalAchievements: achievements.length,
        unlockedCount: achievements.filter((a) => a.achieved).length,
        gameName,
    }
}
