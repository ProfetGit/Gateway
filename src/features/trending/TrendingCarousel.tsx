import React from 'react'
import { Flame, Library } from 'lucide-react'
import { StoreCard } from '@/components/ui/cards/StoreCard'
import { useHorizontalScroller } from '@/components/ui/use-horizontal-scroller'
import { useGameStore } from '@/features/game-library/game-store'
import type { Game } from '@/features/game-library/game-library-types'
import type { TrendingGame } from './trending-types'
import { TrendingHeader } from './TrendingHeader'

export type TrendingCarouselProps = {
    games: TrendingGame[]
    onGameClick: (gameId: number) => void
}

export function TrendingCarousel({ games, onGameClick }: TrendingCarouselProps) {
    const { scrollRef, canScrollLeft, canScrollRight, scrollByPage } = useHorizontalScroller()
    const libraryGames = useGameStore((s) => s.games)
    const openDetail = useGameStore((s) => s.openDetail)

    // Map of steamAppId -> local library Game, for O(1) ownership lookup.
    // Rebuilt when library changes (e.g. sync completes, manual add).
    const ownedByAppId = React.useMemo(() => {
        const map = new Map<string, Game>()
        for (const g of libraryGames) {
            if (g.steamAppId) map.set(g.steamAppId, g)
        }
        return map
    }, [libraryGames])

    // Deduplicate games by ID to prevent React key collisions
    const uniqueGames = React.useMemo(() => {
        const seen = new Map<number, TrendingGame>()
        for (const game of games) {
            if (!seen.has(game.id)) {
                seen.set(game.id, game)
            }
        }
        return Array.from(seen.values())
    }, [games])

    return (
        <>
            <TrendingHeader
                showNav
                canScrollLeft={canScrollLeft}
                canScrollRight={canScrollRight}
                onScrollLeft={() => scrollByPage('left')}
                onScrollRight={() => scrollByPage('right')}
            />
            <div className="relative w-full z-10 group/portal">
                <div
                    ref={scrollRef}
                    className="flex gap-4 overflow-x-auto scrollbar-hide py-4 -mx-10 w-[calc(100%+5rem)] px-10 scroll-px-10 snap-x snap-mandatory"
                    style={{
                        overscrollBehaviorX: 'contain',
                        maskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent' : 'black'} 0%, black 10%, black 90%, ${canScrollRight ? 'transparent' : 'black'} 100%)`,
                        WebkitMaskImage: `linear-gradient(to right, ${canScrollLeft ? 'transparent' : 'black'} 0%, black 10%, black 90%, ${canScrollRight ? 'transparent' : 'black'} 100%)`
                    }}
                >
                    {uniqueGames.map((game, index) => {
                        const ownedGame = ownedByAppId.get(String(game.id))
                        const hasDiscount = (game.discountPercent ?? 0) > 0

                        return (
                            <StoreCard
                                key={game.id}
                                title={game.name}
                                image={game.headerImage}
                                index={index}
                                onClick={() => {
                                    if (ownedGame) {
                                        openDetail(ownedGame)
                                    } else {
                                        onGameClick(game.id)
                                    }
                                }}
                                accentColor="amber"
                                width={280}
                                topLeftBadge={
                                    <span className="text-[10px] font-mono font-bold text-amber-400 bg-black/70 backdrop-blur-sm px-2 py-1 rounded flex items-center gap-1">
                                        <Flame className="w-3 h-3" />
                                        #{index + 1}
                                    </span>
                                }
                                topRightBadge={
                                    ownedGame ? (
                                        <span className="flex items-center gap-1.5 px-2.5 py-1 bg-black/70 backdrop-blur-sm border border-white/25 text-white text-[10px] font-mono font-black uppercase tracking-widest rounded shadow-[0_2px_10px_oklch(0_0_0/0.6)]">
                                            <Library className="w-3 h-3" />
                                            Owned
                                        </span>
                                    ) : hasDiscount ? (
                                        <span className="px-2.5 py-1 bg-green-500 text-white text-xs font-bold rounded shadow-lg shadow-green-500/30">
                                            -{game.discountPercent}%
                                        </span>
                                    ) : null
                                }
                                bottomLeft={
                                    ownedGame ? (
                                        <span className="text-[10px] font-mono font-bold text-white/90 uppercase tracking-wider">
                                            {ownedGame.isInstalled ? 'In library · Installed' : 'In library'}
                                        </span>
                                    ) : game.finalPrice ? (
                                        <div className="flex items-center gap-2">
                                            {game.originalPrice && hasDiscount && (
                                                <span className="text-[11px] text-text-muted line-through opacity-70">
                                                    {game.originalPrice}
                                                </span>
                                            )}
                                            <span className={`text-xs font-mono font-bold ${game.finalPrice === 'Free' ? 'text-emerald-400' : 'text-white'}`}>
                                                {game.finalPrice}
                                            </span>
                                        </div>
                                    ) : null
                                }
                            />
                        )
                    })}
                </div>
            </div>
        </>
    )
}
