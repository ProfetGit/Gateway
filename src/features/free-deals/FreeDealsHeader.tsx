import { motion } from 'framer-motion'
import { Gift, Sparkles } from 'lucide-react'
import { CarouselNav } from '@/components/ui/CarouselNav'

export type FreeDealsHeaderProps = {
    showNav: boolean
    canScrollLeft?: boolean
    canScrollRight?: boolean
    onScrollLeft?: () => void
    onScrollRight?: () => void
}

export function FreeDealsHeader({ showNav, canScrollLeft, canScrollRight, onScrollLeft, onScrollRight }: FreeDealsHeaderProps) {
    return (
        <div className="flex items-center justify-between mb-2 group/header">
            <div className="flex items-center gap-4">
                {/* Animated gift icon */}
                <div className="relative">
                    <motion.div
                        animate={{
                            scale: [1, 1.15, 1],
                            rotate: [0, -8, 8, 0]
                        }}
                        transition={{
                            duration: 2.5,
                            repeat: Infinity,
                            ease: "easeInOut"
                        }}
                        className="relative z-10"
                    >
                        <Gift className="w-5 h-5 text-emerald-400" />
                    </motion.div>
                    <div className="absolute inset-0 bg-emerald-500/50 blur-md animate-pulse" />
                </div>

                <h2 className="text-2xl font-display font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                    Free to Keep
                    <span className="text-xs font-mono font-medium tracking-[0.1em] text-emerald-400/80 px-2 py-0.5 border border-emerald-500/30 rounded flex items-center gap-1.5 bg-emerald-500/10">
                        <Sparkles className="w-3 h-3" />
                        LIMITED
                    </span>
                </h2>
            </div>

            {/* Decorative line */}
            <div className="flex-1 h-px bg-gradient-to-r from-emerald-900/40 via-green-900/20 to-transparent mx-8" />

            {showNav ? (
                <CarouselNav
                    canScrollLeft={canScrollLeft ?? false}
                    canScrollRight={canScrollRight ?? false}
                    onScrollLeft={onScrollLeft ?? (() => { })}
                    onScrollRight={onScrollRight ?? (() => { })}
                    accent="emerald"
                />
            ) : null}
        </div>
    )
}
