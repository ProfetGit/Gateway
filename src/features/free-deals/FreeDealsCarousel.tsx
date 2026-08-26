import { Check, Clock, Gift } from 'lucide-react'
import { StoreCard } from '@/components/ui/cards/StoreCard'
import { useHorizontalScroller } from '@/components/ui/use-horizontal-scroller'
import type { FreeDeal } from './free-deals-types'
import { formatTimeRemaining } from './free-deals-time'
import { FreeDealsHeader } from './FreeDealsHeader'
import { FreeDealStoreChip } from './FreeDealStoreChip'

export type FreeDealsCarouselProps = {
    deals: FreeDeal[]
    claimedIds: Set<string>
    onDealClick: (deal: FreeDeal) => void
    onGameClick?: (gameId: number) => void
}

/**
 * Steam ownership is resolved live in the renderer (the user can claim and come
 * straight back), while Epic ownership is decided in the main process against
 * the Heroic import — hence the two paths.
 */
function isDealClaimed(deal: FreeDeal, claimedIds: Set<string>): boolean {
    if (deal.store === 'steam') {
        return deal.steamAppId ? claimedIds.has(deal.steamAppId) : false
    }
    return deal.alreadyOwned
}

export function FreeDealsCarousel({ deals, claimedIds, onDealClick, onGameClick }: FreeDealsCarouselProps) {
    const { scrollRef, canScrollLeft, canScrollRight, scrollByPage } = useHorizontalScroller()

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
                        const isClaimed = isDealClaimed(deal, claimedIds)
                        const timeLeft = formatTimeRemaining(deal.endDate)

                        return (
                            <StoreCard
                                key={deal.id}
                                title={deal.title}
                                image={deal.image}
                                index={index}
                                onClick={() => {
                                    if (isClaimed && deal.steamAppId && onGameClick) {
                                        // Claimed Steam games are in the library — jump there.
                                        onGameClick(parseInt(deal.steamAppId, 10))
                                    } else {
                                        onDealClick(deal)
                                    }
                                }}
                                accentColor="emerald"
                                width={280}
                                isClaimed={isClaimed}
                                topLeftBadge={
                                    // Store chip sits beside the countdown rather than
                                    // down with the price: the bottom-right slot shares
                                    // its row with a title that already claims 65% of
                                    // the card width.
                                    <div className="flex items-center gap-1.5">
                                        <FreeDealStoreChip store={deal.store} />
                                        {isClaimed ? (
                                            <span className="flex items-center gap-1.5 px-2 py-1 bg-emerald-600/90 backdrop-blur-sm rounded text-[10px] font-mono text-white font-bold">
                                                <Check className="w-3 h-3" />
                                                {deal.store === 'epic' ? 'IN LIBRARY' : 'CLAIMED'}
                                            </span>
                                        ) : timeLeft ? (
                                            <span className="flex items-center gap-1.5 px-2 py-1 bg-black/70 backdrop-blur-sm rounded text-[10px] font-mono text-amber-400">
                                                <Clock className="w-3 h-3" />
                                                {timeLeft}
                                            </span>
                                        ) : null}
                                    </div>
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
                                        {deal.originalPrice ? (
                                            <span className="text-[11px] font-mono text-red-400 line-through opacity-70">
                                                {deal.originalPrice}
                                            </span>
                                        ) : null}
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
