import { useState, useEffect, memo } from 'react'
import { Play, Download, Trash2, Info, Star, ExternalLink, StarOff } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useContextMenuStore } from '../../stores/contextMenuStore'
import type { Game } from '../../types/game'

/**
 * GAME CARD DESIGN PRINCIPLES (Premium + Performance)
 * ══════════════════════════════════════════════════════════════
 * 1. HEXAGON PLAY BUTTON — Centered action on hover
 * 2. CORNER BRACKETS — Animated accent corners on hover
 * 3. GLOW EFFECTS — Crimson shadow bloom on hover
 * 4. IMAGE SCALE — Parallax-like zoom on hover
 * 5. MEMOIZED — Re-renders only when game data changes
 * 6. LOCAL-FIRST — gateway:// protocol with CDN fallback
 * ══════════════════════════════════════════════════════════════
 */

interface GameCardProps {
    game: Game
}

export const GameCard = memo(function GameCard({ game }: GameCardProps) {
    const getInitialSrc = () => {
        if (game.localCoverPath) return `gateway://cover/${game.localCoverPath}`
        return game.coverUrl
    }

    const [imgSrc, setImgSrc] = useState(getInitialSrc)
    const [imageError, setImageError] = useState(false)
    const { openDetail, toggleFavorite, deleteGame } = useGameStore()
    const { open: openContextMenu } = useContextMenuStore()

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

        if (currentSrc.startsWith('gateway://') && game.coverUrl) {
            setImgSrc(game.coverUrl)
            return
        }

        if (!game.steamAppId) {
            setImageError(true)
            return
        }

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
        <article
            className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group isolate bg-void-deep border border-void-border/20 hover:border-crimson-500/50 transition-all duration-300 hover:shadow-[0_8px_30px_oklch(0.52_0.23_25/0.25)]"
            onClick={() => openDetail(game)}
            onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openContextMenu(e.clientX, e.clientY, [
                    {
                        label: 'Play',
                        icon: <Play className="w-4 h-4" />,
                        onClick: () => handlePlay(e)
                    },
                    {
                        label: game.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
                        icon: game.isFavorite ? <StarOff className="w-4 h-4" /> : <Star className="w-4 h-4" />,
                        onClick: () => toggleFavorite(game.id)
                    },
                    {
                        label: 'View Details',
                        icon: <Info className="w-4 h-4" />,
                        onClick: () => openDetail(game)
                    },
                    ...(game.steamAppId ? [{
                        label: 'View in Steam Store',
                        icon: <ExternalLink className="w-4 h-4" />,
                        onClick: () => window.api?.openSteamStore(game.steamAppId!)
                    }] : []),
                    {
                        label: game.isInstalled ? 'Uninstall' : 'Install',
                        icon: <Download className="w-4 h-4" />,
                        onClick: () => {
                            if (game.isInstalled) {
                                if (game.steamAppId) {
                                    window.api?.uninstallGame(game)
                                }
                            } else {
                                handleInstall(e)
                            }
                        }
                    },
                    {
                        label: 'Remove from Library',
                        icon: <Trash2 className="w-4 h-4" />,
                        danger: true,
                        onClick: () => deleteGame(game.id)
                    }
                ])
            }}
        >
            {/* Corner bracket accents on hover — GPU-only (opacity+scale, no layout animation) */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-crimson-500 origin-top-left opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-[opacity,transform] duration-300 ease-out-expo z-40 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-crimson-500 origin-bottom-right opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-[opacity,transform] duration-300 ease-out-expo z-40 pointer-events-none" />

            {/* Base layer — cover or fallback */}
            <div className="absolute inset-0 overflow-hidden">
                {hasCover ? (
                    <img
                        src={imgSrc}
                        alt={game.title}
                        loading="lazy"
                        decoding="async"
                        className="w-full h-full object-cover transition-all duration-500 ease-out group-hover:scale-110"
                        style={{
                            filter: game.isInstalled ? 'none' : 'grayscale(0.6) brightness(0.6)',
                        }}
                        onError={handleImageError}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-void-surface to-void-deep flex items-center justify-center">
                        <span className="text-5xl font-display font-black text-white/10 select-none">
                            {game.title.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none" />

            {/* Scanline overlay */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0/0.03)_3px)] opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />

            {/* Hover glow effect from bottom */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-t from-crimson-500/15 via-transparent to-transparent" />

            {/* Favorite button */}
            <button
                onClick={handleFavorite}
                className="absolute top-2.5 right-2.5 z-30 p-1.5 rounded-sm bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all duration-200"
            >
                <Star
                    className={`w-3.5 h-3.5 transition-colors ${game.isFavorite
                        ? 'text-crimson-500 fill-crimson-500'
                        : 'text-white/60 hover:text-white'
                        }`}
                />
            </button>

            {/* Installed indicator */}
            {game.isInstalled && (
                <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-[0_0_10px_oklch(0.72_0.17_165/0.8)]" />
                </div>
            )}

            {/* ═══════════════════════════════════════════════════════════ */}
            {/* HEXAGON PLAY/INSTALL BUTTON — Center of card on hover      */}
            {/* ═══════════════════════════════════════════════════════════ */}
            <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
                <button
                    onClick={game.isInstalled ? handlePlay : handleInstall}
                    className={`
                        group/hex relative flex items-center justify-center
                        transition-all duration-300 ease-out
                        opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100
                        pointer-events-auto cursor-pointer focus:outline-none
                        hover:!scale-110 active:!scale-95
                    `}
                    style={{ width: 60, height: 52 }}
                >
                    {/* Hexagon shape using SVG for perfect symmetry */}
                    <svg
                        viewBox="0 0 100 87"
                        className="absolute inset-0 w-full h-full overflow-visible"
                        style={{
                            filter: game.isInstalled
                                ? 'drop-shadow(0 0 20px oklch(0.52 0.23 25 / 0.7))'
                                : 'drop-shadow(0 4px 12px oklch(0.08 0.005 25 / 0.5))'
                        }}
                    >
                        <defs>
                            {/* Installed gradient */}
                            <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="oklch(0.52 0.23 25)" />
                                <stop offset="100%" stopColor="oklch(0.39 0.165 25)" />
                            </linearGradient>

                            {/* Uninstalled ghost background */}
                            <linearGradient id="hexGradientGhost" x1="0%" y1="0%" x2="100%" y2="100%">
                                <stop offset="0%" stopColor="oklch(0.22 0.005 25 / 0.95)" />
                                <stop offset="100%" stopColor="oklch(0.16 0.005 25 / 0.95)" />
                            </linearGradient>

                            {/* Fill gradient for download animation */}
                            <linearGradient id="hexFillGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                                <stop offset="0%" stopColor="oklch(0.52 0.23 25)" />
                                <stop offset="100%" stopColor="oklch(0.62 0.235 25)" />
                            </linearGradient>

                            {/* Hexagon clip path for the fill animation */}
                            <clipPath id="hexClip">
                                <polygon points="50,0 100,25 100,62 50,87 0,62 0,25" />
                            </clipPath>
                        </defs>

                        {/* Base hexagon shape */}
                        <polygon
                            points="50,0 100,25 100,62 50,87 0,62 0,25"
                            fill={game.isInstalled ? 'url(#hexGradient)' : 'url(#hexGradientGhost)'}
                            stroke={game.isInstalled ? 'none' : 'oklch(0.98 0.003 25 / 0.3)'}
                            strokeWidth={game.isInstalled ? 0 : 2}
                        />

                        {/* Animated fill layer for uninstalled games */}
                        {!game.isInstalled && (
                            <g clipPath="url(#hexClip)">
                                <rect
                                    x="0"
                                    y="87"
                                    width="100"
                                    height="87"
                                    fill="url(#hexFillGradient)"
                                    className="transition-transform duration-500 ease-out group-hover/hex:-translate-y-full"
                                />
                            </g>
                        )}

                        {/* Border overlay for uninstalled - stays on top */}
                        {!game.isInstalled && (
                            <polygon
                                points="50,0 100,25 100,62 50,87 0,62 0,25"
                                fill="none"
                                stroke="oklch(0.98 0.003 25 / 0.3)"
                                strokeWidth="2"
                                className="transition-all duration-500 group-hover/hex:stroke-white/50"
                            />
                        )}
                    </svg>

                    {/* Icon */}
                    <div className="relative z-10">
                        {game.isInstalled ? (
                            <Play className="w-6 h-6 text-white fill-white ml-0.5 drop-shadow-lg" />
                        ) : (
                            <Download className="w-5 h-5 text-white drop-shadow-lg transition-transform duration-300 group-hover/hex:scale-110" />
                        )}
                    </div>
                </button>
            </div>

            {/* Game title — always visible at bottom */}
            <div className="absolute bottom-0 left-0 right-0 p-3 pointer-events-none z-10">
                <h3
                    className="font-display font-bold text-sm text-white leading-tight group-hover:text-crimson-200 transition-colors duration-300"
                    style={{
                        textShadow: '0 2px 10px oklch(0.08 0.005 25), 0 1px 3px oklch(0.08 0.005 25 / 0.9)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}
                >
                    {game.title}
                </h3>

                {/* Subtle action hint */}
                <span className="text-[9px] font-mono uppercase tracking-widest text-white/40 opacity-0 group-hover:opacity-100 transition-opacity duration-300 mt-1 block">
                    {game.isInstalled ? 'Click to launch' : 'Click to install'}
                </span>
            </div>
        </article>
    )
})
