import { Check, Clock, Gift } from 'lucide-react'
import { StoreCard } from '@/components/ui/cards/StoreCard'
import { useHorizontalScroller } from '@/components/ui/use-horizontal-scroller'
import type { FreeDeal } from './free-deals-types'
import { FreeDealsHeader } from './FreeDealsHeader'

export type FreeDealsCarouselProps = {
    deals: FreeDeal[]
    claimedIds: Set<string>
    onDealClick: (steamAppId: string | null, claimUrl: string) => void
    onGameClick?: (gameId: number) => void
}

export function FreeDealsCarousel({ deals, claimedIds, onDealClick, onGameClick }: FreeDealsCarouselProps) {
    const { scrollRef, canScrollLeft, canScrollRight, scrollByPage } = useHorizontalScroller()

    // Calculate time remaining
    const getTimeRemaining = (endDate: string) => {
        const end = new Date(endDate)
        const now = new Date()
        const diff = end.getTime() - now.getTime()

        if (diff <= 0) return 'Expired'

        const days = Math.floor(diff / (1000 * 60 * 60 * 24))
        const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60))

        if (days > 0) return `${days}d ${hours}h`
        return `${hours}h left`
    }

    return (
        <>
            <FreeDealsHeader
                showNav
                canScrollLeft={canScrollLeft}
                canScrollRight={canScrollRight}
                onScrollLeft={() => scrollByPage('left')}
                onScrollRight={() => scrollByPage('right')}
            />
            <div className="relative w-full z-10 group/portal">
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide py-4 -mx-10 w-[calc(100%+5rem)] px-10 scroll-px-10 snap-x snap-mandatory"
                    style={{
                        overscrollBehaviorX: 'contain',
                        maskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent' : 'black'} 0%, black 10%, black 90%, ${canScrollRight ? 'transparent' : 'black'} 100%)`,
                        WebkitMaskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent' : 'black'} 0%, black 10%, black 90%, ${canScrollRight ? 'transparent' : 'black'} 100%)`
                    }}
                >
                    {deals.map((deal, index) => {
                    const isClaimed = deal.steamAppId ? claimedIds.has(deal.steamAppId) : false

                    return (
                        <StoreCard
                            key={deal.id}
                            title={deal.title}
                            image={deal.image}
                            index={index}
                            onClick={() => {
                                if (isClaimed && deal.steamAppId && onGameClick) {
                                    // Redirect to game detail page for claimed games
                                    onGameClick(parseInt(deal.steamAppId, 10))
                                } else {
                                    // Open claim page for unclaimed games
                                    onDealClick(deal.steamAppId, deal.claimUrl)
                                }
                            }}
                            accentColor="emerald"
                            width={280}
                            isClaimed={isClaimed}
                            topLeftBadge={
                                isClaimed ? (
                                    <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-600/90 backdrop-blur-sm rounded text-[10px] font-mono text-white font-bold">
                                        <Check className="w-3 h-3" />
                                        CLAIMED
                                    </span>
                                ) : (
                                    <span className="flex items-center gap-1.5 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] font-mono text-amber-400">
                                        <Clock className="w-3 h-3" />
                                        {getTimeRemaining(deal.endDate)}
                                    </span>
                                )
                            }
                            topRightBadge={
                                !isClaimed ? (
                                    <span className="px-2.5 py-1.5 bg-emerald-500 text-white text-xs font-black uppercase tracking-wide rounded shadow-lg shadow-emerald-500/40 flex items-center gap-1.5">
                                        <Gift className="w-3.5 h-3.5" />
                                        FREE
                                    </span>
                                ) : null
                            }
                            bottomLeft={
                                <div className="flex items-center gap-2">
                                    <span className="text-[11px] font-mono text-red-400 line-through opacity-70">
                                        {deal.originalPrice}
                                    </span>
                                    <span className="text-xs font-mono font-bold text-emerald-400">
                                        FREE
                                    </span>
                                </div>
                            }
                        />
                    )
                })}
                </div>
            </div>
        </>
    )
}
