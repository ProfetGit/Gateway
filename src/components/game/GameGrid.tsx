import { VirtuosoGrid } from 'react-virtuoso'
import { motion } from 'framer-motion'
import { GameCard } from './GameCard'
import { useFilteredGames } from '../../stores/gameStore'
import { Gamepad2 } from 'lucide-react'
import { forwardRef, useState, useEffect } from 'react'
import type { Game } from '../../types/game'



// Wrapper to handle individual entrance animations
function AnimatedGameCard({ game, index }: { game: Game; index: number }) {
    // ONLY animate the first screen of items (approx 20)
    // Everything else should just "be there" instantly when scrolled to
    if (index > 20) {
        return (
            <div className="min-h-full">
                <GameCard game={game} />
            </div>
        )
    }

    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{
                duration: 0.4,
                ease: "easeOut",
                delay: (index % 5) * 0.05 // Strict left-to-right cascade
            }}
        >
            <GameCard game={game} />
        </motion.div>
    )
}

export function GameGrid() {
    const games = useFilteredGames()
    const [isReady, setIsReady] = useState(false)

    useEffect(() => {
        // Double RAF to ensure the navigation animation frame has started/painted 
        // before we block the thread with the heavy grid initialization.
        requestAnimationFrame(() => {
            requestAnimationFrame(() => {
                setIsReady(true)
            })
        })
    }, [])

    if (!isReady) {
        return <div className="flex-1 min-h-0 bg-void-pure" />
    }

    return (
        <div className="flex-1 min-h-0 bg-void-pure relative">
            {games.length === 0 ? (
                <div className="absolute inset-0 overflow-y-auto">
                    <EmptyState />
                </div>
            ) : (
                <VirtuosoGrid
                    style={{ height: '100%' }}
                    totalCount={games.length}
                    overscan={200} // Reduced overscan slightly to improve initial mount speed
                    listClassName="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-5 p-6 pb-24"
                    itemClassName="min-h-[240px]"
                    itemContent={(index) => (
                        <AnimatedGameCard game={games[index]} index={index} />
                    )}
                />
            )}
        </div>
    )
}

const EmptyState = forwardRef<HTMLDivElement>(function EmptyState(_props, ref) {
    return (
        <motion.div
            ref={ref}
            className="h-full flex flex-col items-center justify-center text-center p-6 min-h-[500px]"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.9 }}
        >
            {/* Void Icon */}
            <div className="relative w-32 h-32 mb-8 flex items-center justify-center">
                <div className="absolute inset-0 border border-crimson-900/30 rotate-45" />
                <div className="absolute inset-4 border border-crimson-900/50 -rotate-12" />
                <Gamepad2 className="w-16 h-16 text-crimson-600/50 drop-shadow-[0_0_15px_rgba(220,38,38,0.5)]" />
                {/* Glitch artifacts */}
                <div className="absolute top-0 right-0 w-2 h-2 bg-crimson-500" />
                <div className="absolute bottom-0 left-0 w-2 h-2 bg-crimson-500" />
            </div>

            {/* Text */}
            <h2 className="text-3xl font-display font-black italic tracking-tighter text-white uppercase mb-2">
                NO_DATA_FOUND
            </h2>
            <p className="text-sm font-mono text-crimson-500/60 uppercase tracking-widest border border-crimson-900/30 px-3 py-1">
                INITIALIZE_LIBRARY_SYNC
            </p>

            {/* Particle decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-crimson-500/40"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -100],
                            opacity: [0, 1, 0],
                        }}
                        transition={{
                            duration: 3 + Math.random() * 5,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                            ease: "linear"
                        }}
                    />
                ))}
            </div>
        </motion.div>
    )
})
