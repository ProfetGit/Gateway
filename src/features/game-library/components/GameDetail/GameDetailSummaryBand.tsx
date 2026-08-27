import { motion } from 'framer-motion'
import { GameDetailBand, SkeletonLines } from './GameDetailBand'
import { trackTransition } from './game-detail-animations'

export type GameDetailSummaryBandProps = {
    description: string | undefined
    isLoading: boolean
    unlocked: number
    total: number
    percentage: number
    hasAchievements: boolean
    compact?: boolean
}

export function GameDetailSummaryBand({
    description, isLoading, unlocked, total, percentage, hasAchievements, compact = false,
}: GameDetailSummaryBandProps) {
    // pr-7 is the close button's gutter: it is pinned at top-4 right-4 over the
    // shell, and the panel's own px-7 left 24px of it sitting on top of the
    // Progress figure.
    return (
        <GameDetailBand index={0} compact={compact} className="grid grid-cols-[1fr_262px] gap-7 pr-7">
            <div>
                <h3 className="text-[9.5px] font-mono font-bold uppercase tracking-[0.2em] text-crimson-400 mb-3">About</h3>
                {isLoading && !description ? (
                    <SkeletonLines count={3} />
                ) : description ? (
                    <p
                        className={`select-text text-[13px] leading-relaxed text-white/60 ${compact ? 'line-clamp-2' : 'line-clamp-3'}`}
                        dangerouslySetInnerHTML={{ __html: description }}
                    />
                ) : (
                    <p className="text-[13px] leading-relaxed text-white/35">No description for this one.</p>
                )}
            </div>

            <div className="pl-7 border-l border-void-border/45">
                <div className="flex items-baseline justify-between gap-3 mb-3">
                    <h3 className="text-[9.5px] font-mono font-bold uppercase tracking-[0.2em] text-crimson-400">Progress</h3>
                    {hasAchievements && (
                        <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-crimson-300">
                            {unlocked} / {total}
                        </span>
                    )}
                </div>

                {hasAchievements ? (
                    <>
                        <div className="flex items-end gap-3">
                            <p className="font-display font-black italic text-[34px] leading-[0.85] tracking-[-0.04em] text-white">
                                {percentage}<span className="text-[15px] text-crimson-500">%</span>
                            </p>
                            <p className="pb-1 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32">
                                {total - unlocked} to go
                            </p>
                        </div>
                        <div className="relative mt-3 h-[3px] bg-void-border/60 overflow-hidden">
                            <motion.i
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: percentage / 100 }}
                                transition={trackTransition}
                                className="absolute inset-0 origin-left bg-crimson-500 shadow-[0_0_10px_oklch(0.58_0.245_25/0.6)]"
                            />
                        </div>
                    </>
                ) : isLoading ? (
                    <SkeletonLines count={2} />
                ) : (
                    <p className="text-[13px] text-white/35">No achievements to track.</p>
                )}
            </div>
        </GameDetailBand>
    )
}
