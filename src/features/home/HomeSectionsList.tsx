import { TrendingSection } from '@/features/trending/TrendingSection'
import { FreeDealsSection } from '@/features/free-deals/FreeDealsSection'
import { AchievementHuntsSection } from '@/features/achievement-hunts/AchievementHuntsSection'
import type { Game } from '@/features/game-library/game-library-types'

export type HomeSectionsListProps = {
    games: Game[]
    onOpenDetail: (game: Game) => void
}

export function HomeSectionsList({ games, onOpenDetail }: HomeSectionsListProps) {
    return (
        <div className="relative z-10 px-16 pb-12 space-y-12 bg-gradient-to-t from-void-pure via-void-pure/95 to-transparent -mt-24 pt-32">
            {/* Steam Trending Row */}
            <TrendingSection />

            {/* Free Deals Row - temporarily free Steam games */}
            <FreeDealsSection
                onGameClick={(appId) => {
                    const game = games.find(g => g.steamAppId === String(appId))
                    if (game) onOpenDetail(game)
                }}
            />

            {/* Achievement Hunts - player-state, auto-hides if no qualifying games */}
            <AchievementHuntsSection />
        </div>
    )
}
