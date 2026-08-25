import React from 'react'
import { motion } from 'framer-motion'
import { Download, Trophy } from 'lucide-react'
import type { AchievementProgress } from './achievements-store'
import type { Game } from '@/features/game-library/game-library-types'
import type { FilterBand } from './AchievementHuntsFilters'

export interface HuntEntry {
    game: Game
    progress: AchievementProgress
}

export type AchievementHuntsListProps = {
    entries: HuntEntry[]
    band: FilterBand
    onRowClick: (game: Game) => void
}

export function AchievementHuntsList({ entries, band, onRowClick }: AchievementHuntsListProps) {
    return (
        <div className="flex-1 overflow-y-auto scrollbar-hide relative z-10">
            {entries.length === 0 ? (
                <EmptyState band={band} />
            ) : (
                <ul className="divide-y divide-white/5">
                    {entries.map((entry, i) => (
                        <HuntRow
                            key={entry.game.id}
                            entry={entry}
                            index={i}
                            onClick={() => onRowClick(entry.game)}
                        />
                    ))}
                </ul>
            )}
        </div>
    )
}

interface HuntRowProps {
    entry: HuntEntry
    index: number
    onClick: () => void
}

function HuntRow({ entry, index, onClick }: HuntRowProps) {
    const { game, progress } = entry
    const [imgError, setImgError] = React.useState(false)

    const thumbUrl = game.steamAppId
        ? `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/library_600x900.jpg`
        : game.coverUrl

    return (
        <motion.li
            initial={{ opacity: 0, x: 16 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: Math.min(index * 0.02, 0.3), duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
        >
            <button
                onClick={onClick}
                className="group relative w-full flex items-center gap-4 px-8 py-3 hover:bg-white/[0.03] focus:outline-none focus-visible:bg-white/5 transition-colors duration-150 text-left"
            >
                {/* Thumb */}
                <div className="relative w-12 h-16 shrink-0 overflow-hidden bg-void-surface border border-void-border/40">
                    {!imgError && thumbUrl ? (
                        <img
                            src={thumbUrl}
                            alt=""
                            onError={() => setImgError(true)}
                            className="w-full h-full object-cover"
                            style={{
                                filter: game.isInstalled ? 'none' : 'grayscale(0.5) brightness(0.65)',
                            }}
                        />
                    ) : (
                        <div className="w-full h-full flex items-center justify-center text-white/30 text-xs font-display font-black">
                            {game.title.slice(0, 2).toUpperCase()}
                        </div>
                    )}
                    {!game.isInstalled && (
                        <div className="absolute bottom-0 inset-x-0 bg-void-pure/85 backdrop-blur-sm px-1 py-0.5 flex items-center justify-center gap-1">
                            <Download className="w-2.5 h-2.5 text-white/60" />
                        </div>
                    )}
                </div>

                {/* Title + Progress bar */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-baseline justify-between gap-3">
                        <h3 className="font-display font-bold text-sm text-white truncate group-hover:text-crimson-100 transition-colors">
                            {game.title}
                        </h3>
                        <span
                            className="font-display font-black italic text-base text-white shrink-0 leading-none tracking-tight"
                            style={{ color: progressColor(progress.percentage) }}
                        >
                            {progress.percentage}%
                        </span>
                    </div>

                    <div className="mt-2 flex items-center gap-3">
                        <div className="relative flex-1 h-[3px] bg-void-elevated rounded-full overflow-hidden">
                            <motion.div
                                initial={{ scaleX: 0 }}
                                animate={{ scaleX: progress.percentage / 100 }}
                                transition={{ delay: Math.min(index * 0.02, 0.3) + 0.1, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                                className="absolute inset-y-0 left-0 right-0 origin-left rounded-full"
                                style={{
                                    backgroundColor: progressColor(progress.percentage),
                                    boxShadow: `0 0 6px ${progressColor(progress.percentage, 0.5)}`,
                                }}
                            />
                        </div>
                        <span className="text-[10px] font-mono font-bold text-white/50 uppercase tracking-wider shrink-0 tabular-nums">
                            {progress.unlocked} / {progress.total}
                        </span>
                    </div>
                </div>
            </button>
        </motion.li>
    )
}

function progressColor(pct: number, alpha: number = 1): string {
    // Emerald for done, amber for almost done, crimson default
    if (pct === 100) return `oklch(0.72 0.17 165 / ${alpha})`
    if (pct >= 70)   return `oklch(0.78 0.17 75 / ${alpha})`
    if (pct === 0)   return `oklch(0.6 0.005 25 / ${alpha})`
    return `oklch(0.58 0.245 25 / ${alpha})`
}

function EmptyState({ band }: { band: FilterBand }) {
    const messages: Record<FilterBand, { title: string; sub: string }> = {
        all:        { title: 'No achievement data',   sub: 'Refresh your library or open a game to load progress' },
        inProgress: { title: 'Nothing in progress',   sub: 'All your games are either untouched or finished' },
        almostDone: { title: 'Nothing close to done', sub: 'Push a game past 70% to see it here' },
        completed:  { title: 'No 100% games yet',     sub: 'Earn every achievement in a game to add it here' },
        untouched:  { title: 'No untouched games',    sub: 'Every game with achievements has at least one earned' },
    }
    const msg = messages[band]

    return (
        <div className="flex flex-col items-center justify-center py-20 px-8 text-center">
            <div className="w-16 h-16 rounded-full bg-void-surface flex items-center justify-center mb-6 border border-void-border/40">
                <Trophy className="w-7 h-7 text-white/20" />
            </div>
            <h3 className="text-base font-display font-bold uppercase tracking-wider text-white/70 mb-2">
                {msg.title}
            </h3>
            <p className="text-xs text-white/40 max-w-xs">
                {msg.sub}
            </p>
        </div>
    )
}
