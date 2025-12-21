import React from 'react'
import { motion } from 'framer-motion'
import { TrendingUp, ExternalLink, Flame } from 'lucide-react'
import type { TrendingGame, TrendingData } from '../../types/trending'

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
            const result = await window.api?.getTrendingGames()
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
        window.open(`https://store.steampowered.com/app/${gameId}`, '_blank')
    }

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
            className="relative"
        >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-2 group/header">
                <div className="flex items-center gap-4">
                    {/* Animated fire icon */}
                    <div className="relative">
                        <motion.div
                            animate={{
                                scale: [1, 1.1, 1],
                                rotate: [0, -5, 5, 0]
                            }}
                            transition={{
                                duration: 2,
                                repeat: Infinity,
                                ease: "easeInOut"
                            }}
                            className="relative z-10"
                        >
                            <Flame className="w-5 h-5 text-orange-500" />
                        </motion.div>
                        <div className="absolute inset-0 bg-orange-500/50 blur-md animate-pulse" />
                    </div>

                    <h2 className="text-2xl font-display font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        Trending
                        <span className="text-xs font-mono font-medium tracking-[0.1em] text-amber-500/80 px-2 py-0.5 border border-amber-500/30 rounded flex items-center gap-1.5">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                            </span>
                            LIVE
                        </span>
                    </h2>
                </div>

                {/* Decorative line */}
                <div className="flex-1 h-px bg-gradient-to-r from-orange-900/40 via-amber-900/20 to-transparent ml-8" />

                <TrendingUp className="w-5 h-5 text-orange-500/40 group-hover/header:text-orange-500 transition-colors duration-300" />
            </div>

            {/* Content */}
            {isLoading ? (
                <TrendingSkeleton />
            ) : error ? (
                <TrendingError message={error} onRetry={fetchTrending} />
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
            {[...Array(6)].map((_, i) => (
                <motion.div
                    key={i}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="flex-shrink-0 w-[220px] aspect-[460/215] rounded-lg bg-void-surface overflow-hidden relative"
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
            <div className="text-crimson-500/60 mb-4">
                <TrendingUp className="w-8 h-8" />
            </div>
            <p className="text-text-secondary text-sm mb-4 text-center max-w-md">{message}</p>
            <motion.button
                onClick={onRetry}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                className="px-4 py-2 bg-crimson-600/20 border border-crimson-600/40 text-crimson-400 text-sm font-mono uppercase tracking-wider rounded hover:bg-crimson-600/30 transition-colors"
            >
                Retry
            </motion.button>
        </motion.div>
    )
}

interface TrendingCarouselProps {
    games: TrendingGame[]
    onGameClick: (gameId: number) => void
}

function TrendingCarousel({ games, onGameClick }: TrendingCarouselProps) {
    const scrollRef = React.useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = React.useState(false)
    const [canScrollRight, setCanScrollRight] = React.useState(true)

    const checkScroll = React.useCallback(() => {
        if (scrollRef.current) {
            const { scrollLeft, scrollWidth, clientWidth } = scrollRef.current
            const firstCard = scrollRef.current.children[0] as HTMLElement
            const startOffset = firstCard?.offsetLeft || 0

            setCanScrollLeft(scrollLeft > startOffset + 5)
            setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
        }
    }, [])

    React.useEffect(() => {
        const el = scrollRef.current
        if (el) {
            el.addEventListener('scroll', checkScroll)
            // Initial check
            const timer = setTimeout(checkScroll, 100)
            window.addEventListener('resize', checkScroll)
            return () => {
                el.removeEventListener('scroll', checkScroll)
                window.removeEventListener('resize', checkScroll)
                clearTimeout(timer)
            }
        }
    }, [checkScroll])

    return (
        <div className="relative w-full z-10 group/portal">
            {/* Left Portal - Visible if scrolling OR holding a partial state */}


            <div
                ref={scrollRef}
                className="flex gap-4 overflow-x-auto scrollbar-hide py-4 -mx-10 w-[calc(100%+5rem)] px-10 scroll-px-10"
                style={{
                    scrollBehavior: 'auto',
                    overscrollBehaviorX: 'contain',
                    maskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent' : 'black'} 0%, black 10%, black 90%, ${canScrollRight ? 'transparent' : 'black'} 100%)`,
                    WebkitMaskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent' : 'black'} 0%, black 10%, black 90%, ${canScrollRight ? 'transparent' : 'black'} 100%)`
                }}
            >
                {games.map((game, index) => (
                    <TrendingCard
                        key={game.id}
                        game={game}
                        index={index}
                        onClick={() => onGameClick(game.id)}
                    />
                ))}
            </div>
        </div>
    )
}



interface TrendingCardProps {
    game: TrendingGame
    index: number
    onClick: () => void
}

function TrendingCard({ game, index, onClick }: TrendingCardProps) {
    const [imageError, setImageError] = React.useState(false)

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
                delay: index * 0.05,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1]
            }}
            className="flex-shrink-0 snap-start relative z-0 hover:z-20"
        >
            <motion.button
                onClick={onClick}
                whileHover={{ scale: 1.08, y: -8 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className="group relative w-[220px] aspect-[460/215] rounded-lg overflow-hidden bg-void-surface border border-void-border/30 shadow-lg focus:outline-none hover:border-crimson-500/50 hover:shadow-[0_8px_30px_rgba(220,38,38,0.25)]"
            >
                {/* Image */}
                {!imageError ? (
                    <img
                        src={game.headerImage}
                        alt={game.name}
                        onError={() => setImageError(true)}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-200 ease-out group-hover:scale-105"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-void-surface to-void-elevated flex items-center justify-center">
                        <span className="text-text-muted text-sm font-mono">{game.name.slice(0, 2)}</span>
                    </div>
                )}

                {/* Gradient overlay - intensifies on hover */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-70 group-hover:opacity-85 transition-opacity duration-300" />

                {/* Corner accent on hover */}
                <div className="absolute top-0 left-0 w-0 h-0 border-t-[3px] border-l-[3px] border-transparent group-hover:w-6 group-hover:h-6 group-hover:border-crimson-500 transition-all duration-300" />
                <div className="absolute bottom-0 right-0 w-0 h-0 border-b-[3px] border-r-[3px] border-transparent group-hover:w-6 group-hover:h-6 group-hover:border-crimson-500 transition-all duration-300" />

                {/* Scanlines */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.05)_3px)] pointer-events-none opacity-30 group-hover:opacity-50 transition-opacity" />

                {/* Discount badge */}
                {(game.discountPercent ?? 0) > 0 && (
                    <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: index * 0.05 + 0.2, type: 'spring' }}
                        className="absolute top-2 right-2 px-2 py-1 bg-green-500 text-white text-xs font-bold rounded shadow-lg shadow-green-500/30"
                    >
                        -{game.discountPercent}%
                    </motion.div>
                )}

                {/* Rank indicator */}
                <div className="absolute top-2 left-2 flex items-center gap-1.5">
                    <span className="text-[10px] font-mono font-bold text-orange-500/80 bg-black/60 backdrop-blur-sm px-1.5 py-0.5 rounded">
                        #{index + 1}
                    </span>
                </div>

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-3">
                    <h3 className="text-white text-sm font-semibold truncate mb-1 group-hover:text-orange-200 transition-colors">
                        {game.name}
                    </h3>

                    <div className="flex items-center justify-between">
                        {game.finalPrice && (
                            <div className="flex items-center gap-2">
                                {game.originalPrice && (game.discountPercent ?? 0) > 0 && (
                                    <span className="text-[10px] text-text-muted line-through">
                                        {game.originalPrice}
                                    </span>
                                )}
                                <span className={`text-xs font-mono font-bold ${game.finalPrice === 'Free' ? 'text-green-400' : 'text-white'
                                    }`}>
                                    {game.finalPrice}
                                </span>
                            </div>
                        )}

                        {/* Platform icons */}
                        <div className="flex items-center gap-1 opacity-50 group-hover:opacity-100 transition-opacity">
                            {game.windowsAvailable && (
                                <span className="text-[8px] font-mono text-text-muted">WIN</span>
                            )}
                            {game.linuxAvailable && (
                                <span className="text-[8px] font-mono text-amber-400">LNX</span>
                            )}
                            {game.macAvailable && (
                                <span className="text-[8px] font-mono text-text-muted">MAC</span>
                            )}
                        </div>
                    </div>
                </div>

                {/* Hover: external link indicator */}
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-3 bg-black/80 rounded-full backdrop-blur-sm opacity-0 scale-75 group-hover:opacity-100 group-hover:scale-100 transition-all duration-300">
                    <ExternalLink className="w-5 h-5 text-crimson-400" />
                </div>
            </motion.button>
        </motion.div>
    )
}
