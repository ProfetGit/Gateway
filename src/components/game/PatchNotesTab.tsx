import { motion } from 'framer-motion'
import { Newspaper, AlertCircle, ExternalLink, Calendar, User, Tag } from 'lucide-react'
import type { FetchNewsResult, NewsItem } from '../../types/game'
import { useState } from 'react'

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
                    <NewsCard key={item.gid} item={item} index={index} />
                ))}
            </div>
        </div>
    )
}

function NewsCard({ item, index }: { item: NewsItem; index: number }) {
    const [isExpanded, setIsExpanded] = useState(false)

    const formatDate = (timestamp: number) => {
        return new Date(timestamp * 1000).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    // Clean up BBCode and HTML from content
    const cleanContent = (content: string) => {
        return content
            // Remove BBCode tags
            .replace(/\[\/?\w+(?:=[^\]]+)?\]/g, '')
            // Remove HTML tags
            .replace(/<[^>]+>/g, '')
            // Clean up multiple newlines
            .replace(/\n{3,}/g, '\n\n')
            // Trim whitespace
            .trim()
    }

    const previewLength = 300
    const cleanedContent = cleanContent(item.contents)
    const needsTruncation = cleanedContent.length > previewLength
    const displayContent = isExpanded
        ? cleanedContent
        : cleanedContent.slice(0, previewLength) + (needsTruncation ? '...' : '')

    // Determine badge color based on feed type
    const getBadgeStyle = (feedlabel: string) => {
        const label = feedlabel.toLowerCase()
        if (label.includes('patch') || label.includes('update')) {
            return 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
        }
        if (label.includes('announcement')) {
            return 'bg-blue-500/20 text-blue-400 border-blue-500/30'
        }
        if (label.includes('event')) {
            return 'bg-purple-500/20 text-purple-400 border-purple-500/30'
        }
        return 'bg-white/10 text-white/60 border-white/20'
    }

    return (
        <motion.article
            className="group relative bg-void-surface border border-void-border hover:border-crimson-500/30 transition-all duration-300"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.3 }}
        >
            {/* Header */}
            <div className="p-5 pb-3 border-b border-void-border">
                <div className="flex items-start justify-between gap-4 mb-3">
                    <h3 className="select-text text-base font-display font-bold text-white leading-tight line-clamp-2 group-hover:text-crimson-400 transition-colors">
                        {item.title}
                    </h3>
                    <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="shrink-0 p-2 text-white/30 hover:text-crimson-500 hover:bg-crimson-500/10 transition-all"
                        title="Open in browser"
                    >
                        <ExternalLink className="w-4 h-4" />
                    </a>
                </div>

                {/* Meta row */}
                <div className="flex flex-wrap items-center gap-3 text-xs font-mono text-white/40">
                    <span className="flex items-center gap-1.5">
                        <Calendar className="w-3 h-3" />
                        {formatDate(item.date)}
                    </span>

                    {item.author && item.author !== 'Unknown' && (
                        <span className="flex items-center gap-1.5">
                            <User className="w-3 h-3" />
                            {item.author}
                        </span>
                    )}

                    <span className={`flex items-center gap-1.5 px-2 py-0.5 border ${getBadgeStyle(item.feedlabel)}`}>
                        <Tag className="w-3 h-3" />
                        {item.feedlabel}
                    </span>
                </div>
            </div>

            {/* Content */}
            <div className="p-5 pt-4">
                <p className="select-text text-sm text-white/50 leading-relaxed whitespace-pre-line">
                    {displayContent}
                </p>

                {needsTruncation && (
                    <button
                        onClick={() => setIsExpanded(!isExpanded)}
                        className="mt-3 text-xs font-mono text-crimson-500 hover:text-crimson-400 uppercase tracking-wider transition-colors"
                    >
                        {isExpanded ? '▲ Show Less' : '▼ Read More'}
                    </button>
                )}
            </div>

            {/* Glow effect on hover */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none transition-opacity duration-300">
                <div className="absolute inset-0 bg-gradient-to-r from-crimson-500/5 to-transparent" />
            </div>
        </motion.article>
    )
}
