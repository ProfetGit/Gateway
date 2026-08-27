import { useState, useEffect, memo } from 'react'
import { InteractiveCard } from '@/components/ui/cards/InteractiveCard'
import { cardStripHeight, cardSurface, cardTextTint } from '@/components/ui/cards/card-motion'
import { useGameStore } from '../game-store'
import { useContextMenuStore } from '@/components/ui/context-menu/context-menu-store'
import type { Game } from '../game-library-types'
import { launchGameWithFeedback } from '../launch-game-with-feedback'
import { installSteamGame } from '../api/install-steam-game'
import { coverSources, initialCoverSource, nextCoverSource } from '../game-cover-src'
import { isCoverReady, markCoverReady, MAX_COVER_ASPECT } from '../cover-cache'
import { GameCardCoverArt } from './GameCardCoverArt'
import { GameCardBadges } from './GameCardBadges'
import { GameCardHoverActions } from './GameCardHoverActions'
import { useGameCardMenu } from './use-game-card-menu'

/**
 * Cover-art tile for the library grid. The card surface, its hover lift and the
 * corner brackets come from InteractiveCard — this file owns the art fallback
 * chain, the badges and the launch/install action.
 */

interface GameCardProps {
    game: Game
    /** Index into the visible grid for staggered load-in. -1 disables animation
     *  (recycled cards during virtualized scroll). */
    animateIndex?: number
}


export const GameCard = memo(function GameCard({ game, animateIndex = -1 }: GameCardProps) {
    // The URL chain lives in game-cover-src, shared with the preloader.
    const startingSrc = initialCoverSource(game)

    const [imgSrc, setImgSrc] = useState(startingSrc)
    const [imageError, setImageError] = useState(false)
    // Already warmed by the preloader? Then render it opaque on the first
    // frame. Fading in an image that is already decoded *is* the pop.
    const [imgLoaded, setImgLoaded] = useState(() => isCoverReady(startingSrc))
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

    // Re-key on the resolved chain, so a resync that mirrors a new cover swaps
    // it in — and a re-render that changes nothing about the art does not.
    const sourceKey = coverSources(game).join('|')
    useEffect(() => {
        const next = initialCoverSource(game)
        setImgSrc(next)
        setImageError(false)
        setImgLoaded(isCoverReady(next))
    }, [sourceKey]) // eslint-disable-line react-hooks/exhaustive-deps

    const handleImageError = () => {
        const next = nextCoverSource(game, imgSrc)
        if (!next) {
            setImageError(true)
            return
        }
        setImgLoaded(isCoverReady(next))
        setImgSrc(next)
    }

    const handleImageLoad = (e: React.SyntheticEvent<HTMLImageElement>) => {
        const { naturalWidth, naturalHeight } = e.currentTarget
        // A banner in a 3:4 slot is a stretched crop. Treat it as a failure and
        // fall through, the same way the preloader does.
        if (naturalHeight > 0 && naturalWidth / naturalHeight > MAX_COVER_ASPECT) {
            handleImageError()
            return
        }
        markCoverReady(imgSrc)
        setImgLoaded(true)
    }

    const hasCover = !!(imgSrc && !imageError)

    const shouldAnimate = animateIndex >= 0
    const animateDelayMs = shouldAnimate ? Math.min(animateIndex * 28, 560) : 0

    return (
        <InteractiveCard
            entranceDelayMs={shouldAnimate ? animateDelayMs : null}
            entranceFrom="bottom"
            brackets={{ colorClass: 'border-crimson-500', className: 'z-40' }}
            aspectRatio="3 / 4"
            transformOrigin="top center"
            ariaLabel={game.title}
            className={`rounded-lg bg-void-deep border border-void-border/20 hover:border-crimson-500/50 hover:shadow-[0_12px_36px_oklch(0.52_0.23_25/0.3)] ${cardSurface}`}
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
            {/* Title rides up by exactly the strip's height when it slides in. */}
            <div
                className="absolute bottom-0 left-0 right-0 pointer-events-none z-10 translate-y-0 group-hover:translate-y-[var(--strip-shift)] transition-transform duration-100 ease-out-expo group-hover:duration-200"
                style={{
                    padding: 'clamp(8px, 3cqw, 18px)',
                    '--strip-shift': `calc(-1 * ${cardStripHeight})`,
                } as React.CSSProperties}
            >
                <h3
                    className={`font-display font-bold text-white leading-tight group-hover:text-crimson-200 ${cardTextTint}`}
                    style={{
                        // Narrower clamp than the other scaled bits: type has a hard
                        // readability floor. Below ~12px the title is lost; above
                        // ~18px it competes with the cover instead of labelling it.
                        // The curve passes through ~13.7px at the 180px default, so
                        // the common case looks as it did at `text-sm`.
                        fontSize: 'clamp(12px, calc(2.2cqw + 9.5px), 18px)',
                        textShadow: '0 2px 10px oklch(0.08 0.005 25), 0 1px 3px oklch(0.08 0.005 25 / 0.9)',
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical',
                        overflow: 'hidden'
                    }}
                >
                    {game.title}
                </h3>
            </div>
        </InteractiveCard>
    )
})
