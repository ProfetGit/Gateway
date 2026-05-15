import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Play, Info } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useUIStore } from '../../stores/uiStore'
import { TrendingSection } from '../../features/trending'
import { FreeDealsSection } from '../../features/free-deals'
import { AchievementHuntsSection } from '../../features/achievement-hunts'
import type { Game } from '../../types/game'

export function HomeView() {
    const { games, openDetail } = useGameStore()
    const { setIsScrolled } = useUIStore()

    // Reset scroll state on mount/unmount
    React.useEffect(() => {
        setIsScrolled(false)
        return () => setIsScrolled(false)
    }, [setIsScrolled])

    // Get most active games (last played)
    const activeCarouselGames = games
        .filter(g => g.lastPlayed)
        .sort((a, b) => new Date(b.lastPlayed!).getTime() - new Date(a.lastPlayed!).getTime())
        .slice(0, 6)

    // Fallback if no recent games
    const displayCarouselGames = activeCarouselGames.length > 0
        ? activeCarouselGames
        : games.slice(0, 6)

    return (
        <div
            onScroll={(e) => setIsScrolled(e.currentTarget.scrollTop > 50)}
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
                        <WideHeroCarousel games={displayCarouselGames} onOpenDetail={openDetail} />

                        {/* CONTENT SECTIONS */}
                        <div className="relative z-10 px-16 pb-12 space-y-12 bg-gradient-to-t from-void-pure via-void-pure/95 to-transparent -mt-24 pt-32">
                            {/* Steam Trending Row */}
                            <TrendingSection />

                            {/* Free Deals Row - temporarily free Steam games */}
                            <FreeDealsSection
                                onGameClick={(appId) => {
                                    const game = games.find(g => g.steamAppId === String(appId))
                                    if (game) openDetail(game)
                                }}
                            />

                            {/* Achievement Hunts - player-state, auto-hides if no qualifying games */}
                            <AchievementHuntsSection />
                        </div>
                    </motion.div>
                ) : (
                    <EmptyVoid key="empty" />
                )}
            </AnimatePresence>
        </div>
    )
}

interface WideHeroCarouselProps {
    games: Game[]
    onOpenDetail: (game: Game) => void
}

function WideHeroCarousel({ games, onOpenDetail }: WideHeroCarouselProps) {
    const [activeIndex, setActiveIndex] = React.useState(0)
    const activeGame = games[activeIndex]

    // Auto-cycle
    React.useEffect(() => {
        if (games.length <= 1) return
        const timer = setInterval(() => {
            setActiveIndex((prev) => (prev + 1) % games.length)
        }, 10000)
        return () => clearInterval(timer)
    }, [games.length, activeIndex])

    const getHeroUrl = (game: Game) => {
        // Priority 1: Steam Hero (Highest quality, reliable) provided we have an App ID
        if (game.steamAppId) {
            return `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/library_hero.jpg`
        }
        // Priority 2: Explicit Hero/Banner URL (e.g. from Lutris API)
        if (game.heroImageUrl) {
            return game.heroImageUrl
        }
        // Fallback: Vertical cover art
        return game.coverUrl
    }

    const getLogoUrl = (game: Game) => {
        // Priority 1: Steam Logo
        if (game.steamAppId) {
            return `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/logo.png`
        }
        // Priority 2: Explicit Logo URL
        if (game.logoImageUrl) {
            return game.logoImageUrl
        }
        return undefined
    }

    const handlePlay = async (e: React.MouseEvent, game: Game) => {
        e.stopPropagation()
        await window.api?.launchGame(game)
    }

    return (
        <section className="relative h-[75vh] min-h-[550px] w-full overflow-hidden group">
            {/* BACKGROUND ART (Full Bleed) */}
            <AnimatePresence mode="popLayout">
                <motion.div
                    key={activeGame.id}
                    className="absolute inset-0"
                    initial={{ opacity: 0, scale: 1.1 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 1.05 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                >
                    <img
                        src={getHeroUrl(activeGame)}
                        alt=""
                        className="w-full h-full object-cover brightness-[0.7] saturate-[1.2] contrast-125"
                    />
                    {/* Cinematic Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-r from-void-pure via-void-pure/60 to-transparent opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-void-pure via-transparent to-void-pure/30" />

                    {/* TEXTURE OVERLAYS */}
                    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat brightness-100 contrast-150" />
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0)_3px)] opacity-[0.05] pointer-events-none" />
                </motion.div>
            </AnimatePresence>

            {/* FLOATING PARTICLES */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                {[...Array(20)].map((_, i) => (
                    <motion.div
                        key={i}
                        className="absolute w-1 h-1 bg-crimson-500/40 rounded-full blur-[1px]"
                        initial={{
                            x: Math.random() * 100 + "%",
                            y: Math.random() * 100 + "%",
                            scale: Math.random() * 0.5 + 0.5,
                            opacity: Math.random() * 0.5
                        }}
                        animate={{
                            y: [null, Math.random() * -100 + "%"],
                            opacity: [null, 0]
                        }}
                        transition={{
                            duration: Math.random() * 10 + 10,
                            repeat: Infinity,
                            ease: "linear",
                            delay: Math.random() * 5
                        }}
                    />
                ))}
            </div>

            {/* HERO CONTENT */}
            <div className="relative z-20 h-full w-full max-w-[1600px] mx-auto flex flex-col justify-center px-12 md:px-20">
                <AnimatePresence mode="wait">
                    <motion.div
                        key={activeGame.id}
                        initial={{ x: -40, opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: 40, opacity: 0 }}
                        transition={{ duration: 0.6, ease: "circOut" }}
                        className="max-w-2xl"
                    >
                        {/* Game Logo or Title */}
                        {getLogoUrl(activeGame) ? (
                            <img
                                src={getLogoUrl(activeGame)}
                                alt={activeGame.title}
                                className="h-32 md:h-44 object-contain mb-6 filter drop-shadow-[0_10px_10px_oklch(0.08_0.005_25/0.5)]"
                            />
                        ) : (
                            <h1 className="text-5xl md:text-8xl font-display font-black text-white mb-4 tracking-tighter drop-shadow-2xl italic uppercase transform -skew-x-6">
                                {activeGame.title}
                            </h1>
                        )}

                        <div className="flex items-center gap-6 mb-8 font-mono text-xs tracking-[0.2em] text-crimson-500/80 uppercase">
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-crimson-500 rounded-full animate-pulse" />
                                {activeGame.playtime ? `${Math.round(activeGame.playtime / 60)} hours played` : 'Never played'}
                            </span>
                            <span className="opacity-50">///</span>
                            <span>{activeGame.source}</span>
                        </div>

                        <div className="flex items-center gap-8">
                            <motion.button
                                onClick={(e) => handlePlay(e, activeGame)}
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
                                        className="flex items-center gap-2 text-[10px] font-mono tracking-[0.3em] text-crimson-500 uppercase font-bold mt-1"
                                        variants={{
                                            idle: { x: 0, opacity: 0.6 },
                                            hover: { x: 12, opacity: 1 }
                                        }}
                                        transition={{ duration: 0.1, ease: "easeOut" }}
                                    >
                                        <span className="w-1.5 h-1.5 bg-crimson-500 rounded-full animate-ping" />
                                        Ready to play
                                    </motion.div>
                                </div>
                            </motion.button>

                            <motion.button
                                onClick={() => onOpenDetail(activeGame)}
                                className="group flex items-center gap-2 px-6 py-3 border-l border-white/20 hover:border-crimson-500/50 hover:bg-white/5 transition-all"
                            >
                                <span className="uppercase tracking-widest text-sm font-bold text-white/60 group-hover:text-white transition-colors">Details</span>
                                <Info className="w-4 h-4 text-white/40 group-hover:text-crimson-500 transition-colors" />
                            </motion.button>
                        </div>
                    </motion.div>
                </AnimatePresence>
            </div>

            {/* SELECTOR (Portrait strip) */}
            {/* SELECTOR (Portrait strip) */}
            <div className="absolute bottom-10 right-10 left-10 md:left-auto md:right-20 z-30 flex items-center gap-3">
                {games.map((game, i) => (
                    <motion.button
                        key={game.id}
                        onClick={() => setActiveIndex(i)}
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
        </section>
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
