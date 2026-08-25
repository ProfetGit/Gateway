import { motion } from 'framer-motion'
import { Trophy, Lock, Check } from 'lucide-react'
import type { Achievement } from '@/features/achievements/api/achievements-schema'

interface AchievementCardProps {
    achievement: Achievement
    index: number
    /** Manually-tracked games only. When absent the card renders no control at
     *  all, so a Steam-tracked achievement can't be toggled by mistake. */
    onToggle?: () => void
}

function formatDate(timestamp: number): string {
    if (!timestamp) return ''
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

export function AchievementCard({ achievement, index, onToggle }: AchievementCardProps) {
    return (
        <motion.div
            className={`
                relative group flex gap-4 p-4 border transition-all duration-300
                ${achievement.achieved
                    ? 'bg-void-surface border-crimson-500/30 hover:border-crimson-500/60 hover:shadow-[0_0_20px_oklch(0.58_0.245_25/0.15)]'
                    : 'bg-void-pure border-void-border hover:border-white/20'
                }
            `}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.5), duration: 0.3 }}
        >
            {/* Icon */}
            <div className="relative shrink-0">
                {achievement.icon || achievement.icongray ? (
                    <img
                        src={achievement.achieved ? achievement.icon : achievement.icongray}
                        alt={achievement.name}
                        className={`
                            w-14 h-14 object-cover border
                            ${achievement.achieved
                                ? 'border-crimson-500/40'
                                : 'border-void-border grayscale opacity-50'
                            }
                        `}
                    />
                ) : (
                    <div className={`
                        w-14 h-14 flex items-center justify-center border
                        ${achievement.achieved
                            ? 'bg-crimson-500/10 border-crimson-500/40'
                            : 'bg-void-surface border-void-border'
                        }
                    `}>
                        {achievement.achieved
                            ? <Trophy className="w-6 h-6 text-crimson-500" />
                            : <Lock className="w-5 h-5 text-white/20" />
                        }
                    </div>
                )}

                {/* Unlocked glow */}
                {achievement.achieved && (
                    <div className="absolute inset-0 bg-crimson-500/20 blur-md -z-10" />
                )}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0 select-text">
                <h4 className={`
                    font-display font-bold text-sm leading-tight mb-1 truncate
                    ${achievement.achieved ? 'text-white' : 'text-white/50'}
                `}>
                    {achievement.name}
                </h4>

                <p className={`
                    text-xs leading-relaxed line-clamp-2
                    ${achievement.achieved ? 'text-white/60' : 'text-white/30'}
                `}>
                    {achievement.description || (achievement.achieved ? 'Achievement unlocked' : 'Hidden achievement')}
                </p>

                <div className="flex items-center gap-2 mt-2">
                    {/* Unlock date */}
                    {achievement.achieved && achievement.unlocktime > 0 && (
                        <p className="text-[10px] font-mono text-crimson-500/80 uppercase tracking-wider">
                            Unlocked {formatDate(achievement.unlocktime)}
                        </p>
                    )}
                    {achievement.globalPercent !== undefined && (
                        <p className="text-[10px] font-mono text-white/30 uppercase tracking-wider">
                            {Math.round(achievement.globalPercent)}% of players
                        </p>
                    )}
                </div>
            </div>

            {/* Status indicator — a real control only when tracking is manual */}
            {onToggle ? (
                <button
                    type="button"
                    onClick={onToggle}
                    aria-pressed={achievement.achieved}
                    title={achievement.achieved ? 'Mark as locked' : 'Mark as unlocked'}
                    className={`absolute top-2 right-2 w-6 h-6 flex items-center justify-center rounded border transition-colors duration-100 ease-out-expo ${
                        achievement.achieved
                            ? 'border-crimson-500/50 bg-crimson-500/15 hover:border-crimson-400'
                            : 'border-void-border bg-void-surface/80 hover:border-white/40'
                    }`}
                >
                    {achievement.achieved ? (
                        <Check className="w-3.5 h-3.5 text-crimson-400" />
                    ) : (
                        <Lock className="w-3 h-3 text-white/25" />
                    )}
                </button>
            ) : (
                <div className="absolute top-3 right-3">
                    {achievement.achieved ? (
                        <div className="w-2 h-2 rounded-full bg-crimson-500 shadow-[0_0_8px_oklch(0.58_0.245_25/0.6)]" />
                    ) : (
                        <Lock className="w-3 h-3 text-white/20" />
                    )}
                </div>
            )}
        </motion.div>
    )
}
