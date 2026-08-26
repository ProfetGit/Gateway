import { AnimatePresence, motion } from 'framer-motion'
import { Info, Play } from 'lucide-react'
import type { Game } from '@/features/game-library/game-library-types'
import { FallbackImage } from '@/components/ui/FallbackImage'

export type HomeHeroContentProps = {
    game: Game
    logoSources: string[]
    onPlay: (e: React.MouseEvent, game: Game) => void
    onOpenDetail: (game: Game) => void
}

export function HomeHeroContent({ game, logoSources, onPlay, onOpenDetail }: HomeHeroContentProps) {
    const title = (
        <h1 className="text-5xl md:text-8xl font-display font-black text-white mb-4 tracking-tighter drop-shadow-2xl italic uppercase transform -skew-x-6">
            {game.title}
        </h1>
    )

    return (
        <div className="relative z-20 h-full w-full max-w-[1600px] mx-auto flex flex-col justify-center px-12 md:px-20">
            <AnimatePresence mode="wait">
                <motion.div
                    key={game.id}
                    initial={{ x: -40, opacity: 0 }}
                    animate={{ x: 0, opacity: 1 }}
                    exit={{ x: 40, opacity: 0 }}
                    transition={{ duration: 0.6, ease: "circOut" }}
                    className="max-w-2xl"
                >
                    {/* Logo when one resolves, otherwise the title carries it */}
                    <FallbackImage
                        sources={logoSources}
                        alt={game.title}
                        className="h-32 md:h-44 object-contain mb-6 filter drop-shadow-[0_10px_10px_oklch(0.08_0.005_25/0.5)]"
                        fallback={title}
                    />

                    <div
                        className="flex items-baseline gap-5 mb-8"
                        style={{ filter: 'drop-shadow(0 2px 6px oklch(0.08 0.005 25 / 0.9))' }}
                    >
                        <div className="flex items-baseline gap-2.5">
                            {game.playtime ? (
                                <>
                                    <span className="font-display font-black text-3xl text-white leading-none tracking-tight">
                                        {Math.round(game.playtime / 60)}
                                    </span>
                                    <span className="text-[11px] font-mono font-bold uppercase tracking-[0.22em] text-white/85">
                                        hours played
                                    </span>
                                </>
                            ) : (
                                <span className="text-xs font-mono font-bold uppercase tracking-[0.22em] text-white/85">
                                    Never played
                                </span>
                            )}
                        </div>
                        <span className="font-mono text-base font-bold text-white/30 leading-none">///</span>
                        <span className="text-[11px] font-mono font-bold uppercase tracking-[0.22em] text-white/75">
                            {game.source}
                        </span>
                    </div>

                    <div className="flex items-center gap-8">
                        <motion.button
                            onClick={(e) => onPlay(e, game)}
                            className="group relative flex items-center gap-6 pl-2 pr-8 py-2 bg-transparent transition-all"
                            initial="idle"
                            whileHover="hover"
                            whileTap="tap"
                        >
                            {/* The Bolt (Icon) */}
                            <motion.div
                                className="relative flex items-center justify-center w-14 h-14 bg-crimson-600 text-white shadow-[0_0_30px_oklch(0.52_0.23_25/0.3)] z-10 rounded-sm"
                                variants={{
                                    idle:  { x: 0, scale: 1 },
                                    hover: { x: 8, scale: 1, backgroundColor: "oklch(0.98 0.003 25)", color: "oklch(0.52 0.23 25)", boxShadow: "0 0 50px oklch(0.98 0.003 25 / 0.4)" },
                                    tap:   { scale: 0.95, transition: { duration: 0.05 } }
                                }}
                                transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
                            >
                                <Play className="w-6 h-6 fill-current" />
                            </motion.div>

                            {/* The Impact (Text) */}
                            <div className="flex flex-col items-start translate-y-1">
                                <motion.span
                                    className="uppercase tracking-tighter text-4xl font-black italic leading-none text-white"
                                    variants={{
                                        idle:  { x: 0, skewX: 0, opacity: 0.9 },
                                        hover: { x: 12, skewX: -12, opacity: 1, textShadow: "4px 4px 0px oklch(0.52 0.23 25 / 0.5)" }
                                    }}
                                    transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    LAUNCH
                                </motion.span>
                                <motion.div
                                    className="flex items-center gap-2 text-[11px] font-mono tracking-[0.22em] text-crimson-400 uppercase font-bold mt-1.5"
                                    variants={{
                                        idle: { x: 0, opacity: 0.75 },
                                        hover: { x: 12, opacity: 1 }
                                    }}
                                    transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    Ready to play
                                </motion.div>
                            </div>
                        </motion.button>

                        <motion.button
                            onClick={() => onOpenDetail(game)}
                            className="group flex items-center gap-2.5 pl-5 pr-2 py-3 border-l border-white/15 hover:border-crimson-500/60 hover:bg-white/[0.03] transition-colors duration-100"
                        >
                            <span className="font-display font-bold uppercase tracking-[0.18em] text-sm text-white/80 group-hover:text-white transition-colors">Details</span>
                            <Info className="w-4 h-4 text-white/35 group-hover:text-crimson-500 transition-colors" />
                        </motion.button>
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}
