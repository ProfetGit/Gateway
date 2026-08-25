import { motion } from 'framer-motion'
import { Newspaper, AlertCircle } from 'lucide-react'
import type { FetchNewsResult } from '../game-library-types'
import { PatchNoteEntry } from './PatchNoteEntry'

interface PatchNotesTabProps {
    data: FetchNewsResult | null
    isLoading: boolean
}

export function PatchNotesTab({ data, isLoading }: PatchNotesTabProps) {

    // Loading skeleton
    if (isLoading) {
        return (
            <div className="space-y-4">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="bg-void-surface border border-void-border animate-pulse"
                        style={{ animationDelay: `${i * 50}ms` }}
                    >
                        <div className="p-5 space-y-3">
                            <div className="h-5 bg-void-border w-3/4" />
                            <div className="h-4 bg-void-border w-1/4" />
                            <div className="h-20 bg-void-border" />
                        </div>
                    </div>
                ))}
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
                    Couldn't load news
                </h3>
                <p className="text-sm text-white/40 max-w-md">
                    {data.error}
                </p>
            </motion.div>
        )
    }

    // No news state
    if (data?.news.length === 0) {
        return (
            <motion.div
                className="flex flex-col items-center justify-center py-20 text-center"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="w-16 h-16 rounded-full bg-void-surface flex items-center justify-center mb-6">
                    <Newspaper className="w-8 h-8 text-white/20" />
                </div>
                <h3 className="text-xl font-display font-bold italic text-white/60 mb-2">
                    No news yet
                </h3>
                <p className="text-sm text-white/30">
                    Nothing new from this game
                </p>
            </motion.div>
        )
    }

    return (
        <div className="space-y-4">
            {/* News Header */}
            <motion.div
                className="flex items-center justify-between mb-2"
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
            >
                <div className="flex items-center gap-3">
                    <Newspaper className="w-5 h-5 text-crimson-500" />
                    <span className="text-sm font-mono text-white/60 uppercase tracking-wider">
                        Latest News
                    </span>
                </div>
                <span className="text-xs font-mono text-white/30">
                    {data?.news.length} {data?.news.length === 1 ? 'item' : 'items'}
                </span>
            </motion.div>

            {/* News Cards */}
            <div className="space-y-3">
                {data?.news.map((item, index) => (
                    <PatchNoteEntry key={item.gid} item={item} index={index} />
                ))}
            </div>
        </div>
    )
}
