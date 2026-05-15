import { VirtuosoGrid } from 'react-virtuoso'
import { motion } from 'framer-motion'
import { GameCard } from './GameCard'
import { useFilteredGames, useGameStore } from '../../stores/gameStore'
import { Gamepad2 } from 'lucide-react'
import { forwardRef, memo } from 'react'
import type { Game } from '../../types/game'

// Memoized card wrapper — prevents re-renders unless game data changes
const MemoizedGameCard = memo(function MemoizedGameCard({ game }: { game: Game }) {
    return <GameCard game={game} />
})

export function GameGrid() {
    const games = useFilteredGames()

    // Removed double-RAF delay — cards render immediately

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
                    overscan={50}
                    listClassName="grid grid-cols-[repeat(auto-fill,minmax(180px,1fr))] gap-5 p-6 pb-24"
                    itemClassName="min-h-[240px]"
                    itemContent={(index) => (
                        <MemoizedGameCard game={games[index]} />
                    )}
                />
            )}
        </div>
    )
}

const EmptyState = forwardRef<HTMLDivElement>(function EmptyState(_props, ref) {
    const openSetupWizard = useGameStore((s) => s.openSetupWizard)

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
                <Gamepad2 className="w-16 h-16 text-crimson-600/50 drop-shadow-[0_0_15px_oklch(0.52_0.23_25/0.5)]" />
                {/* Glitch artifacts */}
                <div className="absolute top-0 right-0 w-2 h-2 bg-crimson-500" />
                <div className="absolute bottom-0 left-0 w-2 h-2 bg-crimson-500" />
            </div>

            {/* Text */}
            <h2 className="text-3xl font-display font-black italic tracking-tighter text-white uppercase mb-2">
                No games found
            </h2>
            <button
                onClick={openSetupWizard}
                className="relative z-10 text-sm font-mono text-crimson-500/80 uppercase tracking-widest border border-crimson-900/50 hover:border-crimson-500 hover:text-crimson-300 hover:bg-crimson-500/5 px-3 py-1 transition-[color,border-color,background-color] duration-200"
            >
                Sync Library Now
            </button>

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
