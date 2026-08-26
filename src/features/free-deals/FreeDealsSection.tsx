import React from 'react'
import { motion } from 'framer-motion'
import { Gift } from 'lucide-react'
import { getFreeDeals } from './api/get-free-deals'
import { openSteamStoreClaim } from './api/open-steam-store-claim'
import { openUrl } from '@/lib/api/navigation'
import type { FreeDeal, FreeDealsData } from './free-deals-types'
import { useFreeDealsClaimTracking } from './use-free-deals-claim-tracking'
import { FreeDealsHeader } from './FreeDealsHeader'
import { FreeDealsCarousel } from './FreeDealsCarousel'

interface FreeDealsSectionProps {
    onGameClick?: (gameId: number) => void
}

export function FreeDealsSection({ onGameClick }: FreeDealsSectionProps) {
    const [data, setData] = React.useState<FreeDealsData | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    // Steam-only: the claim tracker polls the Steam Web API for ownership,
    // which has nothing to say about an Epic giveaway.
    const appIds = React.useMemo(
        () => (data?.deals ?? [])
            .filter(d => d.store === 'steam')
            .map(d => d.steamAppId)
            .filter((id): id is string => id !== null),
        [data]
    )
    const claimedIds = useFreeDealsClaimTracking(appIds)

    const fetchFreeDeals = React.useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await getFreeDeals()
            if (result?.success && result.data) {
                setData(result.data)
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

    // Don't render if no deals and not loading
    if (!isLoading && (!data || data.deals.length === 0) && !error) {
        return null
    }

    const handleClaimGame = (deal: FreeDeal) => {
        // Steam claims go through the Steam client so the post-claim ownership
        // check can fire on window focus; Epic has no such hook, so its store
        // page just opens in the browser.
        if (deal.store === 'steam' && deal.steamAppId) {
            openSteamStoreClaim(deal.steamAppId)
        } else {
            openUrl(deal.claimUrl)
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
