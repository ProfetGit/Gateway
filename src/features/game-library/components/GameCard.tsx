import { useState, useEffect, memo } from 'react'
import { useGameStore } from '../game-store'
import { useContextMenuStore } from '@/components/ui/context-menu/context-menu-store'
import type { Game } from '../game-library-types'
import { launchGameWithFeedback } from '../launch-game-with-feedback'
import { installSteamGame } from '../api/install-steam-game'
import { getMetadataAppId } from '../get-metadata-app-id'
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

const STEAM_CDN = 'https://steamcdn-a.akamaihd.net/steam/apps'

// Matches MAX_COVER_ASPECT in electron/src/shared/image-file.ts. The mirror
// refuses to store a banner as a cover, but a remote fallback URL can still
// resolve to one — Steam serves header.jpg for any app with no library art.
// A wide image in a 3:4 slot renders as a stretched crop, which is worse than
// the designed no-cover tile.
const MAX_COVER_ASPECT = 1.2

export const GameCard = memo(function GameCard({ game, animateIndex = -1 }: GameCardProps) {
    // metadataAppId, not just steamAppId: a manually added game matched to a
    // Steam entry has only the former, and rendered with no cover at all until
    // the art mirror caught up.
    const artAppId = getMetadataAppId(game)

    const getInitialSrc = () => {
        if (game.localCoverPath) return `gateway://cover/${game.localCoverPath}`
        if (game.coverUrl) return game.coverUrl
        return artAppId ? `${STEAM_CDN}/${artAppId}/library_600x900_2x.jpg` : undefined
    }

    const [imgSrc, setImgSrc] = useState(getInitialSrc)
    const [imageError, setImageError] = useState(false)
    const [imgLoaded, setImgLoaded] = useState(false)
    const { openDetail, toggleFavorite } = useGameStore()
    const { open: openContextMenu } = useContextMenuStore()

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await launchGameWithFeedback(game)
    }

    const handleInstall = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (game.steamAppId) {
            await installSteamGame(game.steamAppId)
        }
    }

    const buildMenu = useGameCardMenu(game, {
        onPlay: () => { void launchGameWithFeedback(game) },
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
    }, [game.coverUrl, game.localCoverPath, artAppId]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleImageError = () => {
        const currentSrc = imgSrc || ''

        if (currentSrc.startsWith('gateway://') && game.coverUrl) {
            setImgLoaded(false)
            setImgSrc(game.coverUrl)
            return
        }

        if (!artAppId) {
            setImageError(true)
            return
        }

        if (currentSrc.includes('library_600x900_2x.jpg')) {
            setImgLoaded(false)
            setImgSrc(`${STEAM_CDN}/${artAppId}/library_600x900.jpg`)
        } else if (currentSrc.includes('library_600x900.jpg')) {
            setImgLoaded(false)
            setImgSrc(`${STEAM_CDN}/${artAppId}/header.jpg`)
        } else if (!currentSrc.includes('header.jpg')) {
            setImgLoaded(false)
            setImgSrc(`${STEAM_CDN}/${artAppId}/library_600x900_2x.jpg`)
        } else {
            setImageError(true)
        }
    }

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget
        if (naturalHeight > 0 && naturalWidth / naturalHeight > MAX_COVER_ASPECT) {
            setImageError(true)
            return
        }
        setImgLoaded(true)
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
                onLoad={handleImageLoad}
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
