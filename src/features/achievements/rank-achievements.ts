import type { Achievement } from './api/achievements-schema'

/** Rarity bands, derived from Steam's global unlock percentage. */
export type RarityTier = 'common' | 'uncommon' | 'rare' | 'ultra'

export type AchievementFilter = 'next' | 'locked' | 'unlocked' | 'all'

export const RARITY_LABEL: Record<RarityTier, string> = {
    common: 'Common',
    uncommon: 'Uncommon',
    rare: 'Rare',
    ultra: 'Ultra rare',
}

/**
 * `globalPercent` is how many players own the achievement, so a HIGH number
 * means a common one. Returns null when Steam gave us nothing — non-Steam and
 * manually tracked games have no global stats, and a missing value must not be
 * rendered as "0% — ultra rare".
 */
export function rarityTier(percent: number | undefined): RarityTier | null {
    if (percent === undefined || Number.isNaN(percent)) return null
    if (percent >= 50) return 'common'
    if (percent >= 20) return 'uncommon'
    if (percent >= 5) return 'rare'
    return 'ultra'
}

/**
 * What to play for next: the achievements you are missing that the most other
 * players already have. A high global percentage on a locked achievement means
 * it sits early in the game or on the main path — the cheapest win available.
 *
 * Achievements with no global data sort last rather than first: without a
 * percentage we cannot claim they are easy, and putting them at the top would
 * make the whole list untrustworthy for games where only some rows have stats.
 */
export function rankNextUp(achievements: Achievement[], limit?: number): Achievement[] {
    const locked = achievements.filter((a) => !a.achieved)
    const ranked = [...locked].sort((a, b) => {
        const ap = a.globalPercent
        const bp = b.globalPercent
        if (ap === undefined && bp === undefined) return 0
        if (ap === undefined) return 1
        if (bp === undefined) return -1
        return bp - ap
    })
    return limit === undefined ? ranked : ranked.slice(0, limit)
}

function matchesQuery(achievement: Achievement, query: string): boolean {
    const needle = query.trim().toLowerCase()
    if (!needle) return true
    return `${achievement.name} ${achievement.description}`.toLowerCase().includes(needle)
}

/** The list the surface renders, for one filter chip and one search box. */
export function selectAchievements(
    achievements: Achievement[],
    filter: AchievementFilter,
    query = ''
): Achievement[] {
    const found = achievements.filter((a) => matchesQuery(a, query))

    switch (filter) {
        case 'next':
        case 'locked':
            return rankNextUp(found)
        case 'unlocked':
            return found
                .filter((a) => a.achieved)
                .sort((a, b) => b.unlocktime - a.unlocktime)
        case 'all':
            // Locked first: the point of the surface is what is left to do.
            return [...found].sort((a, b) => {
                if (a.achieved !== b.achieved) return a.achieved ? 1 : -1
                return (b.globalPercent ?? -1) - (a.globalPercent ?? -1)
            })
    }
}
