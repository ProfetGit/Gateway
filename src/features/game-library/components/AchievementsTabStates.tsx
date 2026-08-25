import { motion } from 'framer-motion'
import { Trophy, AlertCircle } from 'lucide-react'

export function AchievementsSkeleton() {
    return (
        <div className="space-y-6">
            <div className="h-16 bg-void-surface border border-void-border animate-pulse" />
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

export function AchievementsError({ error, isProfilePrivate }: { error: string; isProfilePrivate: boolean }) {
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
            <p className="text-sm text-white/40 max-w-md">{error}</p>
            {isProfilePrivate && (
                <p className="text-xs text-white/30 mt-4">Set your Steam profile to public</p>
            )}
        </motion.div>
    )
}

export function AchievementsEmpty() {
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
            <p className="text-sm text-white/30">This game doesn't have any</p>
        </motion.div>
    )
}
