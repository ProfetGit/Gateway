import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Play, Heart, Download } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import type { Game } from '../../types/game'

/**
 * GAME CARD DESIGN PRINCIPLES
 * ══════════════════════════════════════════════════════════════
 * 1. COVER IS KING — Art fills the entire card, no padding
 * 2. INVISIBLE UI — Controls only appear on interaction
 * 3. SINGLE FOCAL POINT — One action, one glance
 * 4. SUBTLE DEPTH — Soft shadows, no harsh borders
 * 5. MICRO-FEEDBACK — Every hover/tap has response < 100ms
 * 6. UNINSTALLED = MUTED — Visual distinction without badges
 * ══════════════════════════════════════════════════════════════
 */

interface GameCardProps {
    game: Game
}

export function GameCard({ game }: GameCardProps) {
    const getInitialSrc = () => {
        if (game.localCoverPath) return `gateway://cover/${game.localCoverPath}`
        return game.coverUrl
    }

    const [imgSrc, setImgSrc] = useState(getInitialSrc())
    const [imageError, setImageError] = useState(false)
    const { openDetail, toggleFavorite } = useGameStore()

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await window.api?.launchGame(game)
    }

    const handleInstall = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (game.steamAppId) {
            await window.api?.installSteamGame(game.steamAppId)
        }
    }

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleFavorite(game.id)
    }

    // Reset state when game changes
    useEffect(() => {
        setImgSrc(getInitialSrc())
        setImageError(false)
    }, [game.coverUrl, game.localCoverPath])

    const handleImageError = () => {
        const currentSrc = imgSrc || ''

        // If local cover failed, fallback to CDN
        if (currentSrc.startsWith('gateway://') && game.coverUrl) {
            setImgSrc(game.coverUrl)
            return
        }

        if (!game.steamAppId) {
            setImageError(true)
            return
        }

        // Strategy: 2x -> 1x -> header -> error
        if (currentSrc.includes('library_600x900_2x.jpg')) {
            setImgSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${game.steamAppId}/library_600x900.jpg`)
        } else if (currentSrc.includes('library_600x900.jpg')) {
            setImgSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${game.steamAppId}/header.jpg`)
        } else {
            setImageError(true)
        }
    }

    const hasCover = imgSrc && !imageError

    return (
        <motion.article
            className="relative aspect-[3/4] rounded-sm overflow-hidden cursor-pointer group isolate bg-void-deep"
            onClick={() => openDetail(game)}
            initial="idle"
            whileHover="hover"
            whileTap="tap"
            variants={{
                idle: { scale: 1 },
                hover: { scale: 1.02 },
                tap: { scale: 0.98 }
            }}
            transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
            {/* HOVER BORDER GLOW */}
            <div className="absolute inset-0 border-2 border-transparent group-hover:border-crimson-500/50 transition-colors duration-300 z-50 pointer-events-none rounded-sm" />

            {/* Base layer — cover or fallback */}
            <div className="absolute inset-0">
                {hasCover ? (
                    <motion.img
                        src={imgSrc}
                        alt={game.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-all duration-500"
                        style={{
                            filter: game.isInstalled ? 'grayscale(0.2) contrast(1.1)' : 'grayscale(1) brightness(0.5)',
                        }}
                        onError={handleImageError}
                    />
                ) : (
                    <div className="w-full h-full bg-void-deep flex items-center justify-center border border-white/5">
                        <span className="text-4xl font-display font-black text-white/20 select-none">
                            {game.title.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* SCANLINE OVERLAY (Hover) */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.5)_3px)] opacity-0 group-hover:opacity-30 transition-opacity duration-300 pointer-events-none" />

            {/* Favorite Indicator */}
            <motion.button
                onClick={handleFavorite}
                className="absolute top-2 right-2 z-30 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
            >
                <Heart
                    className={`w-4 h-4 ${game.isFavorite
                        ? 'text-crimson-500 fill-crimson-500'
                        : 'text-white/50 hover:text-white'
                        }`}
                />
            </motion.button>

            {/* INSTALLED INDICATOR (Tech Dot) */}
            {game.isInstalled && (
                <div className="absolute top-3 left-3 z-30 flex items-center gap-2">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-sm shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                    <span className="text-[10px] font-mono tracking-widest text-emerald-500/80 opacity-0 group-hover:opacity-100 transition-opacity duration-300 uppercase">
                        Ready
                    </span>
                </div>
            )}

            {/* FOOTER OVERLAY (Slide up) */}
            <motion.div
                className="absolute bottom-0 inset-x-0 bg-void-pure/90 backdrop-blur-md border-t border-crimson-500/30 p-4 z-20 flex flex-col gap-3"
                variants={{
                    idle: { y: "100%" },
                    hover: { y: 0 }
                }}
                transition={{ duration: 0.2, ease: "circOut" }}
            >
                {/* Title */}
                <h3 className="font-display font-black text-lg italic tracking-tighter text-white leading-none uppercase transform -skew-x-2">
                    {game.title}
                </h3>

                {/* Action */}
                <div className="w-full">
                    {game.isInstalled ? (
                        <button
                            onClick={handlePlay}
                            className="w-full flex items-center justify-between px-3 py-2 bg-crimson-600 hover:bg-crimson-500 text-white rounded-sm transition-colors group/btn"
                        >
                            <span className="font-mono text-xs font-bold tracking-widest uppercase">Launch</span>
                            <Play className="w-3 h-3 fill-current group-hover/btn:scale-125 transition-transform" />
                        </button>
                    ) : (
                        <button
                            onClick={handleInstall}
                            className="w-full flex items-center justify-between px-3 py-2 border border-white/20 hover:bg-white/5 text-white/60 hover:text-white rounded-sm transition-colors group/btn"
                        >
                            <span className="font-mono text-xs font-bold tracking-widest uppercase">Install</span>
                            <Download className="w-3 h-3 group-hover/btn:translate-y-1 transition-transform" />
                        </button>
                    )}
                </div>
            </motion.div>
        </motion.article>
    )
}
