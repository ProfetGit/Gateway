import { motion } from 'framer-motion'
import { Check, Lock } from 'lucide-react'
import type { Achievement } from './api/achievements-schema'
import { RARITY_LABEL, rarityTier } from './rank-achievements'

const TIER_TEXT: Record<string, string> = {
    common: 'text-white/45',
    uncommon: 'text-emerald-400',
    rare: 'text-amber-400',
    ultra: 'text-crimson-400',
}

export type AchievementTileProps = {
    achievement: Achievement
    index: number
    /** 1-based rank badge, shown only for the top of the Next up list. */
    rank?: number
    /** Present only for manually tracked games, where unlocks are user-owned. */
    onToggle?: () => void
}

export function AchievementTile({ achievement, index, rank, onToggle }: AchievementTileProps) {
    const tier = rarityTier(achievement.globalPercent)
    const unlocked = achievement.achieved
    const icon = unlocked ? achievement.icon : achievement.icongray || achievement.icon

    return (
        <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.025, 0.4), duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="group relative flex gap-3 p-3 bg-void-deep border border-void-border/55 hover:border-crimson-500/60 hover:-translate-y-[3px] transition-[border-color,transform] duration-100 ease-out-expo"
        >
            {rank !== undefined && (
                <span className="absolute -top-px -right-px px-1.5 py-0.5 bg-crimson-600 text-[8px] font-mono font-black uppercase tracking-[0.14em] text-white">
                    Next {rank}
                </span>
            )}

            <div
                className={`relative w-11 h-11 shrink-0 border flex items-center justify-center overflow-hidden ${
                    unlocked
                        ? 'border-crimson-500/55 bg-crimson-950/70 shadow-[0_0_14px_oklch(0.58_0.245_25/0.25)]'
                        : 'border-void-border bg-void-surface opacity-45'
                }`}
            >
                {icon
                    ? <img src={icon} alt="" className="w-full h-full object-cover" />
                    : unlocked ? <Check className="w-4 h-4 text-crimson-400" /> : <Lock className="w-4 h-4 text-white/30" />}
            </div>

            <div className="min-w-0 flex-1">
                <p className={`text-sm font-display font-bold leading-tight truncate ${unlocked ? 'text-white' : 'text-white/65'}`}>
                    {achievement.name}
                </p>
                <p className="mt-0.5 text-[11.5px] leading-snug text-white/42 line-clamp-2">
                    {achievement.description || (achievement.hidden ? 'Hidden until you unlock it' : '—')}
                </p>

                {tier && achievement.globalPercent !== undefined && (
                    <div className="mt-2 flex items-center gap-2">
                        <span className="relative flex-1 h-[2px] bg-void-border/70 overflow-hidden">
                            <motion.i
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: Math.max(achievement.globalPercent / 100, 0.02) }}
                                transition={{ delay: 0.2 + Math.min(index * 0.02, 0.3), duration: 0.7, ease: [0.16, 1, 0.3, 1] }}
                                className={`absolute inset-0 origin-left ${
                                    tier === 'ultra' ? 'bg-crimson-500'
                                    : tier === 'rare' ? 'bg-amber-400'
                                    : tier === 'uncommon' ? 'bg-emerald-500' : 'bg-white/45'
                                }`}
                            />
                        </span>
                        <span className={`text-[8.5px] font-mono font-bold uppercase tracking-[0.14em] ${TIER_TEXT[tier]}`}>
                            {RARITY_LABEL[tier]} · {Math.round(achievement.globalPercent)}%
                        </span>
                    </div>
                )}
            </div>

            {onToggle && (
                <button
                    onClick={onToggle}
                    aria-pressed={unlocked}
                    title={unlocked ? 'Mark as locked' : 'Mark as unlocked'}
                    className={`self-start w-6 h-6 shrink-0 flex items-center justify-center border transition-colors duration-100 ease-out-expo ${
                        unlocked
                            ? 'border-crimson-500/50 bg-crimson-500/15 text-crimson-400'
                            : 'border-void-border/60 text-white/25 hover:text-white hover:border-crimson-500/50'
                    }`}
                >
                    <Check className="w-3.5 h-3.5" />
                </button>
            )}
        </motion.div>
    )
}
