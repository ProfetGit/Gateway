import { motion } from 'framer-motion'
import { Trophy, Lock } from 'lucide-react'
import type { Achievement } from '../../types/game'

interface AchievementCardProps {
    achievement: Achievement
    index: number
}

function formatDate(timestamp: number): string {
    if (!timestamp) return ''
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
    })
}

export function AchievementCard({ achievement, index }: AchievementCardProps) {
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

                {/* Unlock date */}
                {achievement.achieved && achievement.unlocktime > 0 && (
                    <p className="text-[10px] font-mono text-crimson-500/80 mt-2 uppercase tracking-wider">
                        Unlocked {formatDate(achievement.unlocktime)}
                    </p>
                )}
            </div>

            {/* Status indicator */}
            <div className="absolute top-3 right-3">
                {achievement.achieved ? (
                    <div className="w-2 h-2 rounded-full bg-crimson-500 shadow-[0_0_8px_oklch(0.58_0.245_25/0.6)]" />
                ) : (
                    <Lock className="w-3 h-3 text-white/20" />
                )}
            </div>
        </motion.div>
    )
}
