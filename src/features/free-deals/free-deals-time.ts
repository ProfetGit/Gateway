/**
 * Countdown label for a giveaway's end date.
 *
 * Not every source publishes one: GamerPower returns the literal string "N/A"
 * for key giveaways that run until the keys are gone, which `new Date()` turns
 * into an Invalid Date. Left unguarded that rendered as "NaNd NaNh" on the
 * card, so an unparseable date returns null and the caller shows nothing.
 */
export function formatTimeRemaining(endDate: string, now: Date = new Date()): string | null {
    const end = Date.parse(endDate)
    if (Number.isNaN(end)) return null

    const diff = end - now.getTime()
    if (diff <= 0) return 'Expired'

    const days = Math.floor(diff / (1000 * 60 * 60 * 24))
    const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h left`

    const minutes = Math.max(1, Math.floor(diff / (1000 * 60)))
    return `${minutes}m left`
}
