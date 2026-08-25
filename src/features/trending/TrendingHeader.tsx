import { motion } from 'framer-motion'
import { TrendingUp, Flame } from 'lucide-react'
import { CarouselNav } from '@/components/ui/CarouselNav'

export type TrendingHeaderProps = {
    showNav: boolean
    canScrollLeft?: boolean
    canScrollRight?: boolean
    onScrollLeft?: () => void
    onScrollRight?: () => void
}

export function TrendingHeader({ showNav, canScrollLeft, canScrollRight, onScrollLeft, onScrollRight }: TrendingHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-2 group/header">
            <div className="flex items-center gap-4">
                {/* Animated fire icon */}
                <div className="relative">
                    <motion.div
                        animate={{
                            scale: [1, 1.1, 1],
                            rotate: [0, -5, 5, 0]
                        }}
                        transition={{
                            duration: 2,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="relative z-10"
                    >
                        <Flame className="w-5 h-5 text-orange-500" />
                    </motion.div>
                    <div className="absolute inset-0 bg-orange-500/50 blur-md animate-pulse" />
                </div>

                <h2 className="text-2xl font-display font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                    Trending
                    <span className="text-xs font-mono font-medium tracking-[0.1em] text-amber-500/80 px-2 py-0.5 border border-amber-500/30 rounded flex items-center gap-1.5">
                        <span className="relative flex h-2 w-2">
                            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                            <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
                        </span>
                        LIVE
                    </span>
                </h2>
            </div>

            {/* Decorative line */}
            <div className="flex-1 h-px bg-gradient-to-r from-orange-900/40 via-amber-900/20 to-transparent mx-8" />

            {showNav ? (
                <CarouselNav
                    canScrollLeft={canScrollLeft ?? false}
                    canScrollRight={canScrollRight ?? false}
                    onScrollLeft={onScrollLeft ?? (() => { })}
                    onScrollRight={onScrollRight ?? (() => { })}
                    accent="amber"
                />
            ) : (
                <TrendingUp className="w-5 h-5 text-orange-500/40" />
            )}
        </div>
    )
}
