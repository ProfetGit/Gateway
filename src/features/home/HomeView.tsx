import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/features/game-library/game-store'
import { useUIStore } from '@/stores/ui-store'
import { HomeHeroBanner } from './HomeHeroBanner'
import { HomeSectionsList } from './HomeSectionsList'

export function HomeView() {
    const { games, openDetail } = useGameStore()
    const { isScrolled, setIsScrolled } = useUIStore()

    // Reset scroll state on mount/unmount
    React.useEffect(() => {
        setIsScrolled(false)
        return () => setIsScrolled(false)
    }, [setIsScrolled])

    // Get most active games (last played) — memoized so filter+sort don't run on every scroll tick
    const displayCarouselGames = React.useMemo(() => {
        const recent = games
            .filter(g => g.lastPlayed)
            .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())
            .slice(0, 6)
        return recent.length > 0 ? recent : games.slice(0, 6)
    }, [games])

    const handleScroll = React.useCallback((e: React.UIEvent<HTMLDivElement>) => {
        const next = e.currentTarget.scrollTop > 50
        if (next !== isScrolled) setIsScrolled(next)
    }, [isScrolled, setIsScrolled])

    return (
        <div
            onScroll={handleScroll}
            className="relative h-full w-full overflow-y-auto overflow-x-hidden bg-void-pure scrollbar-hide"
        >
            <AnimatePresence mode="wait">
                {games.length > 0 ? (
                    <motion.div
                        key="content"
                        className="min-h-full flex flex-col"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {/* WIDE CINEMATIC HERO CAROUSEL */}
                        <HomeHeroBanner games={displayCarouselGames} onOpenDetail={openDetail} />

                        {/* CONTENT SECTIONS */}
                        <HomeSectionsList games={games} onOpenDetail={openDetail} />
                    </motion.div>
                ) : (
                    <EmptyVoid key="empty" />
                )}
            </AnimatePresence>
        </div>
    )
}

function EmptyVoid() {
    const { openAddModal } = useGameStore()

    return (
        <motion.div
            className="h-full flex flex-col items-center justify-center relative overflow-hidden"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
        >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,oklch(0.58_0.245_25/0.05)_0%,transparent_70%)]" />
            <motion.h2
                className="text-4xl md:text-6xl font-display font-black text-white tracking-tighter italic mb-4"
                initial={{ y: 20 }}
                animate={{ y: 0 }}
            >
                Start your collection
            </motion.h2>
            <p className="text-white/40 font-mono mb-12 tracking-widest uppercase">Sync your library or add a game manually</p>
            <motion.button
                onClick={openAddModal}
                className="px-12 py-5 bg-crimson-600 text-white font-black uppercase tracking-tighter text-xl rounded-sm hover:bg-crimson-500 transition-colors shadow-lg shadow-crimson-900/20"
                whileTap={{ scale: 0.95 }}
            >
                Add Game
            </motion.button>
        </motion.div>
    )
}
