import type { Achievement } from '@/features/achievements/api/achievements-schema'
import { usePanelDensity } from './use-panel-density'
import type { FetchGameDetailsResult } from '../../game-library-types'
import type { NewsItem } from '../../game-news-types'
import { GameDetailNewsBand } from './GameDetailNewsBand'
import { GameDetailNextUp } from './GameDetailNextUp'
import { GameDetailRequirements } from './GameDetailRequirements'
import { GameDetailSummaryBand } from './GameDetailSummaryBand'

export type GameDetailPanelProps = {
    details: FetchGameDetailsResult | null
    detailsLoading: boolean
    achievements: Achievement[]
    achievementsLoading: boolean
    unlocked: number
    total: number
    percentage: number
    news: NewsItem[]
    newsLoading: boolean
    bannerSrc: string | undefined
    onOpenAchievements: () => void
    onSelectNews: (item: NewsItem) => void
}

/**
 * The panel distributes its slack between bands (`justify-between`) rather than
 * letting one band stretch. That is what keeps the whole game on one screen at
 * any window height without either scrolling or leaving a hole.
 */
export function GameDetailPanel({
    details, detailsLoading, achievements, achievementsLoading,
    unlocked, total, percentage, news, newsLoading, bannerSrc, onOpenAchievements, onSelectNews,
}: GameDetailPanelProps) {
    const { ref, isCompact } = usePanelDensity<HTMLDivElement>()

    return (
        <div className="relative flex-1 min-w-0 overflow-hidden flex flex-col">
            {/* The game's own art, well under the content. Without it the panel
                is the largest grey area in the app. */}
            {bannerSrc && (
                <div
                    aria-hidden
                    className="absolute inset-x-0 top-0 h-[46%] opacity-25 pointer-events-none"
                    style={{
                        backgroundImage: `url(${bannerSrc})`,
                        backgroundSize: 'cover',
                        backgroundPosition: 'center top',
                        maskImage: 'linear-gradient(to bottom, black, transparent)',
                        WebkitMaskImage: 'linear-gradient(to bottom, black, transparent)',
                    }}
                />
            )}

            {/* `overflow-y-auto` is the safety net, not the plan: the compact
                density below keeps everything on one screen down to ~720p, and
                only a genuinely tiny window ever scrolls. Scrollbar hidden so
                the fallback never announces itself. */}
            <div
                ref={ref}
                className="relative flex-1 min-h-0 flex flex-col justify-between px-7 pb-1 overflow-y-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
            >
                <GameDetailSummaryBand
                    description={details?.details?.shortDescription}
                    isLoading={detailsLoading}
                    unlocked={unlocked}
                    total={total}
                    percentage={percentage}
                    hasAchievements={total > 0}
                                    compact={isCompact}
                />

                <GameDetailNextUp
                    achievements={achievements}
                    isLoading={achievementsLoading}
                    total={total}
                    onOpenAll={onOpenAchievements}
                                    compact={isCompact}
                />

                <GameDetailNewsBand news={news} isLoading={newsLoading} compact={isCompact} onSelect={onSelectNews} />

                <GameDetailRequirements
                    minimum={details?.details?.pcRequirements?.minimum}
                    recommended={details?.details?.pcRequirements?.recommended}
                    isLoading={detailsLoading}
                                    compact={isCompact}
                />
            </div>
        </div>
    )
}
