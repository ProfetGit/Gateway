import { motion } from 'framer-motion'
import { Search, X } from 'lucide-react'
import { useCountUp } from '@/components/ui/use-count-up'
import type { AchievementFilter } from './rank-achievements'

const FILTERS: { id: AchievementFilter; label: string }[] = [
    { id: 'next', label: 'Next up' },
    { id: 'locked', label: 'Locked' },
    { id: 'unlocked', label: 'Unlocked' },
    { id: 'all', label: 'All' },
]

export type AchievementsSurfaceHeaderProps = {
    title: string
    subtitle?: string
    unlocked: number
    total: number
    filter: AchievementFilter
    onFilter: (f: AchievementFilter) => void
    query: string
    onQuery: (q: string) => void
    onClose: () => void
    /** Hunts mode ranks games, not achievements — its chips and totals differ. */
    showFilters?: boolean
}

export function AchievementsSurfaceHeader({
    title, subtitle, unlocked, total, filter, onFilter, query, onQuery, onClose, showFilters = true,
}: AchievementsSurfaceHeaderProps) {
    const pct = total > 0 ? Math.round((unlocked / total) * 100) : 0
    const shown = Math.round(useCountUp(pct, 700, 180))

    return (
        <div className="relative shrink-0 px-7 pt-6 border-b border-void-border">
            {/* Close sits in its own column rather than absolutely over the row —
                positioned, it landed on top of the completion figure. */}
            <div className="relative flex items-start justify-between gap-6">
                <div className="min-w-0 flex-1 pt-0.5">
                    {subtitle && (
                        <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32 truncate">
                            {subtitle}
                        </p>
                    )}
                    <h2 className="mt-1.5 text-2xl font-display font-black italic uppercase tracking-tight text-white">
                        {title}
                    </h2>
                </div>

                {total > 0 && (
                    <div className="shrink-0 text-right self-end">
                        <p className="font-display font-black italic leading-[0.85] tracking-[-0.04em] text-white text-[44px]">
                            {shown}<span className="text-[18px] text-crimson-500">%</span>
                        </p>
                        <p className="mt-1 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32">
                            {unlocked} of {total} unlocked
                        </p>
                    </div>
                )}

                <button
                    onClick={onClose}
                    aria-label="Close"
                    className="shrink-0 p-2 text-white/35 hover:text-white hover:bg-crimson-600 border border-void-border/40 transition-colors duration-100 ease-out-expo"
                >
                    <X className="w-4 h-4" />
                </button>
            </div>

            {total > 0 && (
                <div className="relative mt-4 h-[3px] bg-void-border/60 overflow-hidden">
                    <motion.i
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: pct / 100 }}
                        transition={{ delay: 0.25, duration: 0.95, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 origin-left bg-crimson-500 shadow-[0_0_10px_oklch(0.58_0.245_25/0.6)]"
                    />
                </div>
            )}

            <div className="flex items-center gap-2.5 py-4 flex-wrap">
                {showFilters && FILTERS.map((f) => (
                    <button
                        key={f.id}
                        onClick={() => onFilter(f.id)}
                        aria-pressed={filter === f.id}
                        className={`relative overflow-hidden px-3.5 py-[7px] border text-[10px] font-mono font-bold uppercase tracking-[0.16em] transition-[color,border-color] duration-100 ease-out-expo ${
                            filter === f.id
                                ? 'text-white border-crimson-500'
                                : 'text-white/50 border-void-border hover:text-white hover:border-crimson-500/55'
                        }`}
                    >
                        <span
                            className={`absolute inset-0 -z-10 bg-crimson-600/85 origin-left transition-[clip-path] duration-200 ease-out-expo ${
                                filter === f.id ? '[clip-path:inset(0)]' : '[clip-path:inset(0_100%_0_0)]'
                            }`}
                        />
                        {f.label}
                    </button>
                ))}

                <div className="relative flex-1 min-w-[150px]">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-white/25" />
                    <input
                        value={query}
                        onChange={(e) => onQuery(e.target.value)}
                        placeholder="Search"
                        className="w-full bg-void-deep border border-void-border pl-9 pr-3 py-2 text-[11px] font-mono tracking-[0.08em] text-white placeholder:text-white/30 placeholder:uppercase placeholder:tracking-[0.16em] focus:outline-none focus:border-crimson-500 transition-colors duration-100 ease-out-expo"
                    />
                </div>
            </div>
        </div>
    )
}
