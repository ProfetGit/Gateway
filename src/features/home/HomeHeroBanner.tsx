import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { launchGameWithFeedback } from '@/features/game-library/launch-game-with-feedback'
import type { Game } from '@/features/game-library/game-library-types'
import { HomeHeroContent } from './HomeHeroContent'
import { HomeHeroSelector } from './HomeHeroSelector'
import { heroArtSources, logoArtSources } from './hero-art-sources'
import { FallbackImage } from '@/components/ui/FallbackImage'

export type HomeHeroBannerProps = {
    games: Game[]
    onOpenDetail: (game: Game) => void
}


export function HomeHeroBanner({ games, onOpenDetail }: HomeHeroBannerProps) {
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

    if (!activeGame) return null

    const handlePlay = async (e: React.MouseEvent, game: Game) => {
        e.stopPropagation()
        await launchGameWithFeedback(game)
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
                    <FallbackImage
                        sources={heroArtSources(activeGame)}
                        alt=""
                        className="w-full h-full object-cover brightness-[0.7] saturate-[1.2] contrast-125"
                        fallback={<div className="w-full h-full bg-void-surface" />}
                    />
                    {/* Cinematic Gradients */}
                    <div className="absolute inset-0 bg-gradient-to-r from-void-pure via-void-pure/60 to-transparent opacity-90" />
                    <div className="absolute inset-0 bg-gradient-to-t from-void-pure via-transparent to-void-pure/30" />

                    {/* TEXTURE OVERLAYS */}
                    <div className="absolute inset-0 opacity-[0.03] mix-blend-overlay pointer-events-none bg-[url('/noise.svg')] bg-repeat brightness-100 contrast-150" />
                    <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0)_3px)] opacity-[0.05] pointer-events-none" />
                </motion.div>
            </AnimatePresence>

            <HomeHeroContent
                game={activeGame}
                logoSources={logoArtSources(activeGame)}
                onPlay={handlePlay}
                onOpenDetail={onOpenDetail}
            />

            <HomeHeroSelector
                games={games}
                activeIndex={activeIndex}
                onSelect={setActiveIndex}
            />
        </section>
    )
}
