/**
 * Single source of truth for achievement completion percentage.
 *
 * Floors rather than rounds so 199/200 reads 99%, not a falsely triumphant
 * 100% — with an explicit exact-completion case so a genuine 100% still shows
 * as 100%. The detail tab used Math.round and the hunts store used Math.floor,
 * so the same game could read 100% in one place and 99% in the other.
 */
export function computeCompletionPercent(unlocked: number, total: number): number {
    if (total <= 0) return 0
    if (unlocked >= total) return 100
    return Math.floor((unlocked / total) * 100)
}
