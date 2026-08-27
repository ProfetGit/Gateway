/**
 * A game as the Hunts mode of the surface needs it. Deliberately NOT the
 * library's `Game`: this domain is imported by both game-library and
 * achievement-hunts, so it must not import back from either.
 */
export interface AchievementGameSummary {
    id: string
    title: string
    coverSrc?: string
    unlocked: number
    total: number
    percentage: number
}
