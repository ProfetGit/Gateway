import { motion, AnimatePresence } from 'framer-motion'
import { GameCard } from './GameCard'
import { useFilteredGames } from '../../stores/gameStore'
import { Gamepad2 } from 'lucide-react'
import { forwardRef } from 'react'

export function GameGrid() {
    const games = useFilteredGames()

    return (
        <div className="h-full overflow-y-auto overflow-x-hidden p-6 scrollbar-hide">
            <AnimatePresence mode="popLayout">
                {games.length === 0 ? (
                    <EmptyState key="empty" />
                ) : (
                    <motion.div
                        key="grid"
                        className="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-5"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    >
                        {games.map((game, index) => (
                            <motion.div
                                key={game.id}
                                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                                animate={{
                                    opacity: 1,
                                    y: 0,
                                    scale: 1,
                                    transition: {
                                        delay: index * 0.03,
                                        duration: 0.4,
                                        ease: [0.16, 1, 0.3, 1]
                                    }
                                }}
                                exit={{
                                    opacity: 0,
                                    scale: 0.9,
                                    transition: { duration: 0.2 }
                                }}
                                layout
                            >
                                <GameCard game={game} />
                            </motion.div>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

const EmptyState = forwardRef<HTMLDivElement>(function EmptyState(_props, ref) {
    return (
        <motion.div
            ref={ref}
            className="h-full flex flex-col items-center justify-center text-center"
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
