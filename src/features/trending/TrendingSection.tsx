import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp } from 'lucide-react'
import type { TrendingData } from './trending-types'
import { getTrendingGames } from './api/get-trending-games'
import { openSteamStore } from '@/lib/api/navigation'
import { TrendingHeader } from './TrendingHeader'
import { TrendingCarousel } from './TrendingCarousel'

interface TrendingSectionProps {
    onGameClick?: (gameId: number) => void
}

export function TrendingSection({ onGameClick }: TrendingSectionProps) {
    const [data, setData] = React.useState<TrendingData | null>(null)
    const [isLoading, setIsLoading] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    const fetchTrending = React.useCallback(async () => {
        setIsLoading(true)
        setError(null)
        try {
            const result = await getTrendingGames()
            if (result?.success && result.data) {
                setData(result.data)
            } else {
                setError(result?.error || 'Failed to fetch trending games')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error')
        } finally {
            setIsLoading(false)
        }
    }, [])

    React.useEffect(() => {
        fetchTrending()
    }, [fetchTrending])

    // Don't render if no data and not loading
    if (!isLoading && (!data || data.games.length === 0) && !error) {
        return null
    }

    const handleOpenInSteam = (gameId: number) => {
        // Open in Steam app directly
        openSteamStore(gameId)
    }

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="relative"
        >
            {/* Content */}
            {isLoading ? (
                <>
                    <TrendingHeader showNav={false} />
                    <TrendingSkeleton />
                </>
            ) : error ? (
                <>
                    <TrendingHeader showNav={false} />
                    <TrendingError message={error} onRetry={fetchTrending} />
                </>
            ) : data ? (
                <TrendingCarousel
                    games={data.games}
                    onGameClick={onGameClick || handleOpenInSteam}
                />
            ) : null}
        </motion.section>
    )
}

function TrendingSkeleton() {
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

function TrendingError({ message, onRetry }: { message: string; onRetry: () => void }) {
    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center py-12 px-6 rounded-lg border border-void-border/30 bg-void-surface/30"
        >
            <div className="text-amber-500/60 mb-4">
                <TrendingUp className="w-8 h-8" />
            </div>
            <p className="text-text-secondary text-sm mb-4 text-center max-w-md">{message}</p>
            <motion.button
                onClick={onRetry}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-amber-600/20 border border-amber-600/40 text-amber-400 text-sm font-mono uppercase tracking-wider rounded hover:bg-amber-600/30 transition-colors"
            >
                Retry
            </motion.button>
        </motion.div>
    )
}
