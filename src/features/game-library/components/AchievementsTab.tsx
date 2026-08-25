import { motion } from 'framer-motion'
import { Trophy, AlertCircle } from 'lucide-react'
import type { FetchAchievementsResult } from '@/features/achievements/api/achievements-schema'
import { AchievementCard } from './AchievementCard'

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
                    Couldn't load achievements
                </h3>
                <p className="text-sm text-white/40 max-w-md">
                    {data.error}
                </p>
                {data.errorCode === 'PROFILE_PRIVATE' && (
                    <p className="text-xs text-white/30 mt-4">
                        Set your Steam profile to public
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
                    No achievements
                </h3>
                <p className="text-sm text-white/30">
                    This game doesn't have any
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

