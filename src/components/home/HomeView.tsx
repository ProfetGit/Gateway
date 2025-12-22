import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Star, Gamepad2, Play, Info } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useUIStore } from '../../stores/uiStore'
import { GameCard } from '../game/GameCard'
import { TrendingSection } from '../../features/trending'
import { FreeDealsSection } from '../../features/free-deals'
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

    // Filtered rows
    const favoriteGames = games.filter(g => g.isFavorite).slice(0, 8)
    const installedGames = games
        .filter(g => g.isInstalled && !displayCarouselGames.some(r => r.id === g.id))
        .slice(0, 8)

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
                            <FreeDealsSection />

                            {/* Favorites Row */}
                            {favoriteGames.length > 0 && (
                                <GameRow
                                    title="Favorites"
                                    icon={<Star className="w-5 h-5 text-ember-500" />}
                                    games={favoriteGames}
                                    delay={0.2}
                                />
                            )}

                            {/* Ready to Play Row */}
                            {installedGames.length > 0 && (
                                <GameRow
                                    title="Ready to Play"
                                    icon={<Gamepad2 className="w-5 h-5 text-crimson-500" />}
                                    games={installedGames}
                                    delay={0.3}
                                />
                            )}
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
        if (game.source === 'steam' && game.steamAppId) {
            return `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/library_hero.jpg`
        }
        return game.coverUrl // Fallback
    }

    const getLogoUrl = (game: Game) => {
        if (game.source === 'steam' && game.steamAppId) {
            return `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/logo.png`
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
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#000_3px)] opacity-[0.05] pointer-events-none" />
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
                                className="h-32 md:h-44 object-contain mb-6 filter drop-shadow-[0_10px_10px_rgba(0,0,0,0.5)]"
                            />
                        ) : (
                            <h1 className="text-5xl md:text-8xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/50 mb-4 tracking-tighter drop-shadow-2xl italic uppercase transform -skew-x-6">
                                {activeGame.title}
                            </h1>
                        )}

                        <div className="flex items-center gap-6 mb-8 font-mono text-xs tracking-[0.2em] text-crimson-500/80 uppercase">
                            <span className="flex items-center gap-2">
                                <span className="w-1.5 h-1.5 bg-crimson-500 rounded-full animate-pulse" />
                                {activeGame.playtime ? `${Math.round(activeGame.playtime / 60)}H LOGGED` : 'NEW ENTRY'}
                            </span>
                            <span className="opacity-50">///</span>
                            <span>SOURCE: {activeGame.source}</span>
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
                                    className="relative flex items-center justify-center w-14 h-14 bg-crimson-600 text-white shadow-[0_0_30px_rgba(220,38,38,0.3)] z-10 rounded-sm"
                                    variants={{
                                        idle: { x: 0, scale: 1 },
                                        hover: { x: 8, scale: 1, backgroundColor: "#ffffff", color: "#dc2626", boxShadow: "0 0 50px rgba(255,255,255,0.4)" },
                                        tap: { scale: 0.95, transition: { duration: 0.05 } }
                                    }}
                                    transition={{ type: "spring", stiffness: 500, damping: 35, mass: 1 }}
                                >
                                    <Play className="w-6 h-6 fill-current" />
                                </motion.div>

                                {/* The Impact (Text) */}
                                <div className="flex flex-col items-start translate-y-1">
                                    <motion.span
                                        className="uppercase tracking-tighter text-4xl font-black italic leading-none text-white"
                                        variants={{
                                            idle: { x: 0, skewX: 0, opacity: 0.9 },
                                            hover: { x: 12, skewX: -12, opacity: 1, textShadow: "4px 4px 0px rgba(220,38,38,0.5)" }
                                        }}
                                        transition={{ type: "spring", stiffness: 500, damping: 35, mass: 1 }}
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
                                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(220,38,38,0.2)_3px)] pointer-events-none" />
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
                                        className="h-full bg-crimson-500 shadow-[0_0_10px_#ef4444]"
                                        initial={{ width: 0 }}
                                        animate={{ width: "100%" }}
                                        transition={{ duration: 10, ease: "linear" }}
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

function GameRow({ title, icon, games, delay = 0 }: { title: string, icon: React.ReactNode, games: Game[], delay?: number }) {
    return (
        <motion.section
            initial={{ y: 30, opacity: 0 }}
            whileInView={{ y: 0, opacity: 1 }}
            viewport={{ once: true }}
            transition={{ delay, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
            <div className="flex items-center justify-between mb-8 group/header relative">
                <div className="flex items-center gap-4">
                    <div className="relative">
                        <div className="w-3 h-3 bg-crimson-500 rotate-45" />
                        <div className="absolute inset-0 bg-crimson-500/50 blur animate-pulse" />
                    </div>
                    <h2 className="text-2xl font-display font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        {title}
                        <span className="text-xs font-mono font-medium tracking-[0.1em] text-void-border px-2 py-0.5 border border-void-border/30 rounded ml-2">
                            0{games.length}
                        </span>
                    </h2>
                </div>

                {/* Decorative line */}
                <div className="flex-1 h-px bg-gradient-to-r from-crimson-900/40 to-transparent ml-8" />

                <div className="opacity-40 group-hover/header:opacity-100 transition-opacity duration-300 transform group-hover/header:translate-x-1">
                    {icon}
                </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-5">
                {games.map((game) => (
                    <GameCard key={game.id} game={game} />
                ))}
            </div>
        </motion.section>
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
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(255,58,58,0.05)_0%,transparent_70%)]" />
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
