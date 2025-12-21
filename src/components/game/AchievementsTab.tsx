import { motion } from 'framer-motion'
import { Trophy, Lock, AlertCircle } from 'lucide-react'
import type { Achievement, FetchAchievementsResult } from '../../types/game'

interface AchievementsTabProps {
    data: FetchAchievementsResult | null
    isLoading: boolean
}

export function AchievementsTab({ data, isLoading }: AchievementsTabProps) {

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-6">
                {/* Progress skeleton */}
                <div className="h-16 bg-void-surface border border-void-border animate-pulse" />

                {/* Grid skeleton */}
                <div className="grid grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 9 }).map((_, i) => (
                        <div
                            key={i}
                            className="h-24 bg-void-surface border border-void-border animate-pulse"
                            style={{ animationDelay: `${i * 50}ms` }}
                        />
                    ))}
                </div>
            </div>
        )
    }

    // Error state
    if (!data?.success && data?.error) {
        return (
            <motion.div
                className="flex flex-col items-center justify-center py-20 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="w-16 h-16 rounded-full bg-crimson-500/10 flex items-center justify-center mb-6">
                    <AlertCircle className="w-8 h-8 text-crimson-500" />
                </div>
                <h3 className="text-xl font-display font-bold italic text-white/80 mb-2">
                    CANNOT LOAD ACHIEVEMENTS
                </h3>
                <p className="text-sm text-white/40 max-w-md">
                    {data.error}
                </p>
                {data.errorCode === 'PROFILE_PRIVATE' && (
                    <p className="text-xs text-white/30 mt-4">
                        Set your Steam profile and game details to Public
                    </p>
                )}
            </motion.div>
        )
    }

    // No achievements state
    if (data?.totalAchievements === 0) {
        return (
            <motion.div
                className="flex flex-col items-center justify-center py-20 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="w-16 h-16 rounded-full bg-void-surface flex items-center justify-center mb-6">
                    <Trophy className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-xl font-display font-bold italic text-white/60 mb-2">
                    NO ACHIEVEMENTS
                </h3>
                <p className="text-sm text-white/30">
                    This game doesn't have Steam achievements
                </p>
            </motion.div>
        )
    }

    const percentage = data ? Math.round((data.unlockedCount / data.totalAchievements) * 100) : 0

    return (
        <div className="space-y-6">
            {/* Progress Header */}
            <motion.div
                className="bg-void-surface border border-void-border p-5"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-3">
                        <Trophy className="w-5 h-5 text-crimson-500" />
                        <span className="text-sm font-mono text-white/60 uppercase tracking-wider">
                            Achievement Progress
                        </span>
                    </div>
                    <div className="flex items-baseline gap-2">
                        <span className="text-2xl font-display font-black italic text-white">
                            {data?.unlockedCount}
                        </span>
                        <span className="text-sm font-mono text-white/40">
                            / {data?.totalAchievements}
                        </span>
                    </div>
                </div>

                {/* Progress bar */}
                <div className="relative h-2 bg-void-border overflow-hidden">
                    <motion.div
                        className="absolute inset-y-0 left-0 bg-gradient-to-r from-crimson-600 to-crimson-500"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                    {/* Glow effect */}
                    <motion.div
                        className="absolute inset-y-0 left-0 bg-crimson-500/50 blur-sm"
                        initial={{ width: 0 }}
                        animate={{ width: `${percentage}%` }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                    />
                </div>

                <div className="flex justify-between mt-2">
                    <span className="text-xs font-mono text-white/30">0%</span>
                    <span className="text-xs font-mono text-crimson-500 font-bold">{percentage}%</span>
                    <span className="text-xs font-mono text-white/30">100%</span>
                </div>
            </motion.div>

            {/* Achievements Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
                {data?.achievements.map((achievement, index) => (
                    <AchievementCard
                        key={achievement.apiname}
                        achievement={achievement}
                        index={index}
                    />
                ))}
            </div>
        </div>
    )
}

function AchievementCard({ achievement, index }: { achievement: Achievement; index: number }) {
    const formatDate = (timestamp: number) => {
        if (!timestamp) return ''
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    return (
        <motion.div
            className={`
                relative group flex gap-4 p-4 border transition-all duration-300
                ${achievement.achieved
                    ? 'bg-void-surface border-crimson-500/30 hover:border-crimson-500/60 hover:shadow-[0_0_20px_rgba(255,58,58,0.15)]'
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
            <div className="flex-1 min-w-0">
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
                    <div className="w-2 h-2 rounded-full bg-crimson-500 shadow-[0_0_8px_rgba(255,58,58,0.6)]" />
                ) : (
                    <Lock className="w-3 h-3 text-white/20" />
                )}
            </div>
        </motion.div>
    )
}
