import { motion } from 'framer-motion'
import { Trophy } from 'lucide-react'

interface AchievementsProgressHeaderProps {
    unlockedCount: number
    totalAchievements: number
    percentage: number
    isManual: boolean
}

export function AchievementsProgressHeader({
    unlockedCount,
    totalAchievements,
    percentage,
    isManual,
}: AchievementsProgressHeaderProps) {
    return (
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
                    {isManual && (
                        <span className="px-2 py-0.5 text-[9px] font-mono font-bold uppercase tracking-widest text-crimson-300 border border-crimson-500/40 bg-crimson-500/10 rounded">
                            Tracked by you
                        </span>
                    )}
                </div>
                <div className="flex items-baseline gap-2">
                    <span className="text-2xl font-display font-black italic text-white">{unlockedCount}</span>
                    <span className="text-sm font-mono text-white/40">/ {totalAchievements}</span>
                </div>
            </div>

            {/* scaleX rather than width — animating width would trigger layout */}
            <div className="relative h-2 bg-void-border overflow-hidden">
                <motion.div
                    className="absolute inset-y-0 left-0 right-0 origin-left bg-gradient-to-r from-crimson-600 to-crimson-500"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: percentage / 100 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
                <motion.div
                    className="absolute inset-y-0 left-0 right-0 origin-left bg-crimson-500/50 blur-sm"
                    initial={{ scaleX: 0 }}
                    animate={{ scaleX: percentage / 100 }}
                    transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                />
            </div>

            <div className="flex justify-between mt-2">
                <span className="text-xs font-mono text-white/30">0%</span>
                <span className="text-xs font-mono text-crimson-500 font-bold">{percentage}%</span>
                <span className="text-xs font-mono text-white/30">100%</span>
            </div>
        </motion.div>
    )
}
