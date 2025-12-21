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
            <motion.div
                className="relative w-24 h-24 mb-8"
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{
                    duration: 4,
                    repeat: Infinity,
                    ease: "easeInOut"
                }}
            >
                <div className="absolute inset-0 bg-crimson-600/20 rounded-full blur-2xl" />
                <div className="absolute inset-4 bg-crimson-600/30 rounded-full blur-xl" />
                <Gamepad2 className="absolute inset-0 m-auto w-12 h-12 text-crimson-600/50" />
            </motion.div>

            {/* Text */}
            <h2 className="text-2xl font-etched text-text-ghost mb-3 tracking-wider">
                THE VOID AWAITS
            </h2>
            <p className="text-sm font-mono text-text-muted max-w-xs">
                Add games to your library or sync with Steam to begin
            </p>

            {/* Particle decoration */}
            <div className="absolute inset-0 pointer-events-none overflow-hidden">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-crimson-600/30 rounded-full"
                        style={{
                            left: `${Math.random() * 100}%`,
                            top: `${Math.random() * 100}%`,
                        }}
                        animate={{
                            y: [0, -100, 0],
                            opacity: [0, 0.5, 0],
                        }}
                        transition={{
                            duration: 5 + Math.random() * 5,
                            repeat: Infinity,
                            delay: Math.random() * 5,
                        }}
                    />
                ))}
            </div>
        </motion.div>
    )
})
