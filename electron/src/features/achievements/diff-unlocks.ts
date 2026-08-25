import type { ParsedAchievement } from './parse-achievement-file'

/** Unlocks back-dated beyond this are recorded silently, never announced. */
export const STALE_UNLOCK_SECONDS = 60 * 60 * 12

/**
 * Diffs a freshly parsed achievement file against what we already recorded and
 * returns only genuine lock -> unlock transitions.
 *
 * Two rejections matter. Anything already recorded is skipped, so a rewritten
 * file doesn't replay the whole list. And an unlock timestamped far in the past
 * is recorded but not announced — that's a restored save or a copied prefix,
 * not something the player just did.
 *
 * Kept free of side effects and heavy imports so it stays directly testable.
 */
export function diffUnlocks(
    parsed: ParsedAchievement[],
    known: Record<string, number>,
    nowSeconds = Math.floor(Date.now() / 1000),
): { newlyUnlocked: ParsedAchievement[]; merged: Record<string, number> } {
    const merged: Record<string, number> = { ...known }
    const newlyUnlocked: ParsedAchievement[] = []

    for (const achievement of parsed) {
        if (!achievement.achieved) continue
        if (known[achievement.name] !== undefined) continue

        const unlockTime = achievement.unlockTime > 0 ? achievement.unlockTime : nowSeconds
        merged[achievement.name] = unlockTime

        if (nowSeconds - unlockTime > STALE_UNLOCK_SECONDS) continue

        newlyUnlocked.push({ ...achievement, unlockTime })
    }

    return { newlyUnlocked, merged }
}
