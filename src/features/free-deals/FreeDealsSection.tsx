import React from 'react'
import { motion } from 'framer-motion'
import { Gift, Sparkles, Clock, Check } from 'lucide-react'
import { StoreCard } from '../../components/shared/StoreCard'
import { CarouselNav } from '../../components/shared/CarouselNav'
import { useHorizontalScroller } from '../../components/shared/useHorizontalScroller'
import { getFreeDeals, checkGameOwned, onGameClaimed, openSteamStoreClaim, openUrl } from '../../lib/api'
import type { FreeDeal, FreeDealsData, FetchFreeDealsResult } from '../../types/freeDeals'

interface FreeDealsSectionProps {
    onGameClick?: (gameId: number) => void
}

export function FreeDealsSection({ onGameClick }: FreeDealsSectionProps) {
    const [data, setData] = React.useState<FreeDealsData | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)
    const [claimedIds, setClaimedIds] = React.useState<Set<string>>(new Set())

    const fetchFreeDeals = React.useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result: FetchFreeDealsResult = await getFreeDeals()
            if (result?.success && result.data) {
                setData(result.data)

                // Check which games are already owned
                const appIds = result.data.deals
                    .map(d => d.steamAppId)
                    .filter((id): id is string => id !== null)

                if (appIds.length > 0) {
                    const newClaimed = new Set<string>()
                    for (const appId of appIds) {
                        const res = await checkGameOwned(appId)
                        if (res) {
                            newClaimed.add(appId)
                        }
                    }
                    setClaimedIds(newClaimed)
                }
            } else {
                setError(result?.error || 'Failed to fetch free deals')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchFreeDeals()
    }, [fetchFreeDeals])

    // Listen for game claimed events (after focus returns)
    React.useEffect(() => {
        let unlisten: (() => void) | undefined
        onGameClaimed((data: { appId: string; owned: boolean }) => {
            if (data.owned) {
                setClaimedIds(prev => new Set([...prev, data.appId]))
            }
        }).then(fn => { unlisten = fn })
        return () => { unlisten?.() }
    }, [])

    // Don't render if no deals and not loading
    if (!isLoading && (!data || data.deals.length === 0) && !error) {
        return null
    }

    const handleClaimGame = (steamAppId: string | null, claimUrl: string) => {
        if (steamAppId) {
            openSteamStoreClaim(steamAppId)
        } else {
            openUrl(claimUrl)
        }
    }

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.15 }}
            className="relative"
        >
            {isLoading ? (
                <>
                    <FreeDealsHeader showNav={false} />
                    <FreeDealsSkeleton />
                </>
            ) : error ? (
                <>
                    <FreeDealsHeader showNav={false} />
                    <FreeDealsError message={error} onRetry={fetchFreeDeals} />
                </>
            ) : data ? (
                <FreeDealsCarousel
                    deals={data.deals}
                    claimedIds={claimedIds}
                    onDealClick={handleClaimGame}
                    onGameClick={onGameClick}
                />
            ) : null}
        </motion.section>
    )
}

interface FreeDealsHeaderProps {
    showNav: boolean
    canScrollLeft?: boolean
    canScrollRight?: boolean
    onScrollLeft?: () => void
    onScrollRight?: () => void
}

function FreeDealsHeader({ showNav, canScrollLeft, canScrollRight, onScrollLeft, onScrollRight }: FreeDealsHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-2 group/header">
            <div className="flex items-center gap-4">
                {/* Animated gift icon */}
                <div className="relative">
                    <motion.div
                        animate={{
                            scale: [1, 1.15, 1],
                            rotate: [0, -8, 8, 0]
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="relative z-10"
                    >
                        <Gift className="w-5 h-5 text-emerald-400" />
                    </motion.div>
                    <div className="absolute inset-0 bg-emerald-500/50 blur-md animate-pulse" />
                </div>

                <h2 className="text-2xl font-display font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                    Free to Keep
                    <span className="text-xs font-mono font-medium tracking-[0.1em] text-emerald-400/80 px-2 py-0.5 border border-emerald-500/30 rounded flex items-center gap-1.5 bg-emerald-500/10">
                        <Sparkles className="w-3 h-3" />
                        LIMITED
                    </span>
                </h2>
            </div>

            {/* Decorative line */}
            <div className="flex-1 h-px bg-gradient-to-r from-emerald-900/40 via-green-900/20 to-transparent mx-8" />

            {showNav ? (
                <CarouselNav
                    canScrollLeft={canScrollLeft ?? false}
                    canScrollRight={canScrollRight ?? false}
                    onScrollLeft={onScrollLeft ?? (() => { })}
                    onScrollRight={onScrollRight ?? (() => { })}
                    accent="emerald"
                />
            ) : null}
        </div>
    )
}

function FreeDealsSkeleton() {
    return (
        <div className="flex gap-4 overflow-hidden">
            {[...Array(4)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="shrink-0 w-[280px] aspect-[460/215] rounded-lg bg-void-surface overflow-hidden relative"
                >
                    {/* Shimmer effect */}
                    <div className="absolute inset-0 -translate-x-full animate-[shimmer_1.5s_infinite] bg-gradient-to-r from-transparent via-white/5 to-transparent" />

                    {/* Placeholder elements */}
                    <div className="absolute bottom-0 left-0 right-0 p-3 space-y-2">
                        <div className="h-3 w-3/4 bg-void-border rounded animate-pulse" />
                        <div className="h-2 w-1/2 bg-void-border/50 rounded animate-pulse" />
                    </div>
                </motion.div>
            ))}
        </div>
    )
}

function FreeDealsError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 px-6 rounded-lg border border-void-border/30 bg-void-surface/30"
        >
            <div className="text-emerald-500/60 mb-4">
                <Gift className="w-8 h-8" />
            </div>
            <p className="text-text-secondary text-sm mb-4 text-center max-w-md">{message}</p>
            <motion.button
                onClick={onRetry}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-emerald-600/20 border border-emerald-600/40 text-emerald-400 text-sm font-mono uppercase tracking-wider rounded hover:bg-emerald-600/30 transition-colors"
            >
                Retry
            </motion.button>
        </motion.div>
    )
}

interface FreeDealsCarouselProps {
    deals: FreeDeal[]
    claimedIds: Set<string>
    onDealClick: (steamAppId: string | null, claimUrl: string) => void
    onGameClick?: (gameId: number) => void
}

function FreeDealsCarousel({ deals, claimedIds, onDealClick, onGameClick }: FreeDealsCarouselProps) {
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
