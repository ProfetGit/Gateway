import { useState, useEffect, memo } from 'react'
import { useGameStore } from '../game-store'
import { useContextMenuStore } from '@/components/ui/context-menu/context-menu-store'
import type { Game } from '../game-library-types'
import { launchGame } from '../api/launch-game'
import { installSteamGame } from '../api/install-steam-game'
import { GameCardCoverArt } from './GameCardCoverArt'
import { GameCardBadges } from './GameCardBadges'
import { GameCardHoverActions } from './GameCardHoverActions'
import { useGameCardMenu } from './use-game-card-menu'

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
    /** Index into the visible grid for staggered load-in. -1 disables animation
     *  (recycled cards during virtualized scroll). */
    animateIndex?: number
}

export const GameCard = memo(function GameCard({ game, animateIndex = -1 }: GameCardProps) {
    const getInitialSrc = () => {
        if (game.localCoverPath) return `gateway://cover/${game.localCoverPath}`
        return game.coverUrl
    }

    const [imgSrc, setImgSrc] = useState(getInitialSrc)
    const [imageError, setImageError] = useState(false)
    const [imgLoaded, setImgLoaded] = useState(false)
    const { openDetail, toggleFavorite } = useGameStore()
    const { open: openContextMenu } = useContextMenuStore()

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await launchGame(game)
    }

    const handleInstall = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (game.steamAppId) {
            await installSteamGame(game.steamAppId)
        }
    }

    const buildMenu = useGameCardMenu(game, {
        onPlay: () => { void launchGame(game) },
        onInstall: () => { if (game.steamAppId) void installSteamGame(game.steamAppId) },
    })

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleFavorite(game.id)
    }

    useEffect(() => {
        setImgSrc(getInitialSrc())
        setImageError(false)
        setImgLoaded(false)
    }, [game.coverUrl, game.localCoverPath]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleImageError = () => {
        const currentSrc = imgSrc || ''

        if (currentSrc.startsWith('gateway://') && game.coverUrl) {
            setImgLoaded(false)
            setImgSrc(game.coverUrl)
            return
        }

        if (!game.steamAppId) {
            setImageError(true)
            return
        }

        if (currentSrc.includes('library_600x900_2x.jpg')) {
            setImgLoaded(false)
            setImgSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${game.steamAppId}/library_600x900.jpg`)
        } else if (currentSrc.includes('library_600x900.jpg')) {
            setImgLoaded(false)
            setImgSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${game.steamAppId}/header.jpg`)
        } else {
            setImageError(true)
        }
    }

    const hasCover = !!(imgSrc && !imageError)

    const shouldAnimate = animateIndex >= 0
    const animateDelayMs = shouldAnimate ? Math.min(animateIndex * 28, 560) : 0

    return (
        <article
            className={`relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group isolate bg-void-deep border border-void-border/20 hover:border-crimson-500/50 transition-all duration-300 hover:shadow-[0_8px_30px_oklch(0.52_0.23_25/0.25)]${shouldAnimate ? ' animate-card-in' : ''}`}
            style={shouldAnimate ? { animationDelay: `${animateDelayMs}ms` } : undefined}
            onClick={() => openDetail(game)}
            onContextMenu={(e) => {
                e.preventDefault()
                e.stopPropagation()
                openContextMenu(e.clientX, e.clientY, buildMenu())
            }}
        >
            <GameCardCoverArt
                title={game.title}
                isInstalled={game.isInstalled}
                imgSrc={imgSrc}
                imgLoaded={imgLoaded}
                hasCover={hasCover}
                onLoad={() => setImgLoaded(true)}
                onError={handleImageError}
            />

            <GameCardBadges
                isFavorite={game.isFavorite}
                isInstalled={game.isInstalled}
                onFavorite={handleFavorite}
            />

            <GameCardHoverActions
                isInstalled={game.isInstalled}
                onClick={(e) => (game.isInstalled ? handlePlay(e) : handleInstall(e))}
            />

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
