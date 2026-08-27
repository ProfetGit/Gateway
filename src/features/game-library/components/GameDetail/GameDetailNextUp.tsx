import { motion } from 'framer-motion'
import { ArrowUpRight, Lock } from 'lucide-react'
import type { Achievement } from '@/features/achievements/api/achievements-schema'
import { RARITY_LABEL, rankNextUp, rarityTier } from '@/features/achievements/rank-achievements'
import { GameDetailBand } from './GameDetailBand'
import { rowVariants } from './game-detail-animations'

/** Five is a shortlist. More than that and this stops being a prompt and starts
 *  duplicating the surface behind "All achievements". */
const SHORTLIST = 5
const SHORTLIST_COMPACT = 3
const BAND_INDEX = 1

const TIER_TEXT: Record<string, string> = {
    common: 'text-white/50',
    uncommon: 'text-emerald-400',
    rare: 'text-amber-400',
    ultra: 'text-crimson-400',
}

export type GameDetailNextUpProps = {
    achievements: Achievement[]
    isLoading: boolean
    total: number
    onOpenAll: () => void
    compact?: boolean
}

export function GameDetailNextUp({ achievements, isLoading, total, onOpenAll, compact = false }: GameDetailNextUpProps) {
    const rows = rankNextUp(achievements, compact ? SHORTLIST_COMPACT : SHORTLIST)

    return (
        <GameDetailBand
            index={BAND_INDEX}
            compact={compact}
            title="Next up · easiest you haven't got"
            aside={total > 0 && (
                <button
                    onClick={onOpenAll}
                    className="group flex items-center gap-1.5 text-[9.5px] font-mono font-bold uppercase tracking-[0.16em] text-white/40 hover:text-white border-b border-transparent hover:border-crimson-500 transition-[color,border-color] duration-100 ease-out-expo"
                >
                    All {total} achievements
                    <ArrowUpRight className="w-3 h-3 transition-transform duration-100 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
            )}
        >
            {isLoading ? (
                <div className="space-y-2.5">
                    {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="flex items-center gap-3">
                            <div className="w-7 h-7 shrink-0 skeleton-block" />
                            <div className="h-3 flex-1 max-w-[240px] skeleton-block" />
                        </div>
                    ))}
                </div>
            ) : rows.length === 0 ? (
                <p className="text-[13px] text-white/35">
                    {total > 0 ? 'Every achievement unlocked. Nothing left to hunt.' : 'No achievements for this one.'}
                </p>
            ) : (
                rows.map((a, i) => {
                    const tier = rarityTier(a.globalPercent)
                    return (
                        <motion.button
                            key={a.apiname}
                            variants={rowVariants(BAND_INDEX, i)}
                            onClick={onOpenAll}
                            className="group w-full flex items-center gap-3 py-[7px] text-left border-t border-void-border/25 first:border-t-0"
                        >
                            <span className="w-3 shrink-0 text-[10px] font-mono font-bold text-white/22 group-hover:text-crimson-400 transition-colors duration-100 ease-out-expo">
                                {i + 1}
                            </span>

                            <span className="w-7 h-7 shrink-0 flex items-center justify-center overflow-hidden border border-void-border bg-void-surface/70 group-hover:border-crimson-500 transition-colors duration-100 ease-out-expo">
                                {a.icongray || a.icon
                                    ? <img src={a.icongray || a.icon} alt="" className="w-full h-full object-cover opacity-70" />
                                    : <Lock className="w-3 h-3 text-white/30" />}
                            </span>

                            <span className="min-w-0 flex-1">
                                <span className="block text-[12.5px] font-bold leading-tight text-white truncate">{a.name}</span>
                                <span className="block mt-0.5 text-[9px] font-mono font-bold uppercase tracking-[0.14em] text-white/30 truncate">
                                    {a.description || 'Hidden until you unlock it'}
                                </span>
                            </span>

                            {tier && a.globalPercent !== undefined && (
                                <span className="shrink-0 flex items-baseline gap-2">
                                    <span className={`text-[12.5px] font-mono font-bold ${TIER_TEXT[tier]}`}>
                                        {Math.round(a.globalPercent)}%
                                    </span>
                                    <span className="w-[62px] text-right text-[8.5px] font-mono font-bold uppercase tracking-[0.14em] text-white/30">
                                        {RARITY_LABEL[tier]}
                                    </span>
                                </span>
                            )}
                        </motion.button>
                    )
                })
            )}
        </GameDetailBand>
    )
}
