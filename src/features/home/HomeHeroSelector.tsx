import { motion } from 'framer-motion'
import type { Game } from '@/features/game-library/game-library-types'

export type HomeHeroSelectorProps = {
    games: Game[]
    activeIndex: number
    onSelect: (index: number) => void
    getHeroUrl: (game: Game) => string | undefined
}

export function HomeHeroSelector({ games, activeIndex, onSelect, getHeroUrl }: HomeHeroSelectorProps) {
    return (
        <div className="absolute bottom-10 right-10 left-10 md:left-auto md:right-20 z-30 flex items-center gap-3">
            {games.map((game, i) => (
                <motion.button
                    key={game.id}
                    onClick={() => onSelect(i)}
                    className="relative group/thumb focus:outline-none"
                >
                    <motion.div
                        className={`relative w-16 md:w-20 aspect-[3/4] rounded-sm overflow-hidden transition-all duration-500 ${i === activeIndex
                            ? 'opacity-100 scale-110 z-10'
                            : 'opacity-40 hover:opacity-100 scale-100 hover:scale-105 grayscale hover:grayscale-0'
                            }`}
                    >
                        <img src={game.coverUrl || getHeroUrl(game)} className="w-full h-full object-cover" alt="" />

                        {/* Active scanline overlay */}
                        {i === activeIndex && (
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0.52_0.23_25/0.2)_3px)] pointer-events-none" />
                        )}
                    </motion.div>

                    {/* Creative Active Indicator (Brackets) */}
                    {i === activeIndex && (
                        <motion.div
                            className="absolute -inset-2 pointer-events-none"
                            layoutId="activeErrorBracket"
                            transition={{ type: "spring", stiffness: 300, damping: 30 }}
                        >
                            <div className="absolute top-0 left-0 w-2 h-2 border-t-2 border-l-2 border-crimson-500" />
                            <div className="absolute top-0 right-0 w-2 h-2 border-t-2 border-r-2 border-crimson-500" />
                            <div className="absolute bottom-0 left-0 w-2 h-2 border-b-2 border-l-2 border-crimson-500" />
                            <div className="absolute bottom-0 right-0 w-2 h-2 border-b-2 border-r-2 border-crimson-500" />

                            {/* Progress bar integrated into bracket */}
                            <motion.div
                                className="absolute -bottom-4 left-0 right-0 h-0.5 bg-crimson-500/50"
                            >
                                <motion.div
                                    className="h-full bg-crimson-500 shadow-[0_0_10px_oklch(0.62_0.235_25)] origin-left"
                                    initial={{ scaleX: 0 }}
                                    animate={{ scaleX: 1 }}
                                    transition={{ duration: 10, ease: "linear" }}
                                    style={{ width: '100%' }}
                                />
                            </motion.div>
                        </motion.div>
                    )}
                </motion.button>
            ))}
        </div>
    )
}
