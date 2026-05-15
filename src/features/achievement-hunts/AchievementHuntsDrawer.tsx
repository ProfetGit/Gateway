import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy, Download, ArrowUpDown } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useAchievementsStore, type AchievementProgress } from '../../stores/achievementsStore'
import type { Game } from '../../types/game'

type FilterBand = 'all' | 'inProgress' | 'almostDone' | 'completed' | 'untouched'
type SortMode = 'pctDesc' | 'pctAsc' | 'recent' | 'title'

interface HuntEntry {
    game: Game
    progress: AchievementProgress
}

const FILTER_CHIPS: Array<{ id: FilterBand; label: string; accent: string }> = [
    { id: 'all',         label: 'All',         accent: 'text-white/80 border-white/30 hover:border-white/60' },
    { id: 'inProgress',  label: 'In Progress', accent: 'text-crimson-300 border-crimson-700/40 hover:border-crimson-500/70' },
    { id: 'almostDone',  label: 'Almost Done', accent: 'text-amber-300 border-amber-700/40 hover:border-amber-500/70' },
    { id: 'completed',   label: 'Completed',   accent: 'text-emerald-300 border-emerald-700/40 hover:border-emerald-500/70' },
    { id: 'untouched',   label: 'Untouched',   accent: 'text-white/50 border-white/15 hover:border-white/40' },
]

const SORT_CHIPS: Array<{ id: SortMode; label: string }> = [
    { id: 'pctDesc', label: '% Desc' },
    { id: 'pctAsc',  label: '% Asc' },
    { id: 'recent',  label: 'Recent' },
    { id: 'title',   label: 'A→Z' },
]

function matchesBand(p: AchievementProgress, band: FilterBand): boolean {
    if (p.total === 0) return false
    switch (band) {
        case 'all':         return true
        case 'inProgress':  return p.percentage >= 1 && p.percentage <= 99
        case 'almostDone':  return p.percentage >= 70 && p.percentage <= 99
        case 'completed':   return p.percentage === 100
        case 'untouched':   return p.unlocked === 0
    }
}

function sortEntries(a: HuntEntry, b: HuntEntry, mode: SortMode): number {
    switch (mode) {
        case 'pctDesc': return b.progress.percentage - a.progress.percentage
        case 'pctAsc':  return a.progress.percentage - b.progress.percentage
        case 'recent': {
            const aTime = a.game.lastPlayed ? new Date(a.game.lastPlayed).getTime() : 0
            const bTime = b.game.lastPlayed ? new Date(b.game.lastPlayed).getTime() : 0
            return bTime - aTime
        }
        case 'title':   return a.game.title.localeCompare(b.game.title)
    }
}

export function AchievementHuntsDrawer() {
    const libraryGames = useGameStore((s) => s.games)
    const openDetail = useGameStore((s) => s.openDetail)
    const isOpen = useGameStore((s) => s.isHuntsDrawerOpen)
    const onClose = useGameStore((s) => s.closeHuntsDrawer)
    const progressMap = useAchievementsStore((s) => s.progress)

    const [band, setBand] = React.useState<FilterBand>('inProgress')
    const [sort, setSort] = React.useState<SortMode>('pctDesc')

    // Escape to close
    React.useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') onClose()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    const entries = React.useMemo<HuntEntry[]>(() => {
        const result: HuntEntry[] = []
        for (const game of libraryGames) {
            if (!game.steamAppId) continue
            const progress = progressMap[game.steamAppId]
            if (!progress) continue
            if (!matchesBand(progress, band)) continue
            result.push({ game, progress })
        }
        result.sort((a, b) => sortEntries(a, b, sort))
        return result
    }, [libraryGames, progressMap, band, sort])

    const handleRowClick = (game: Game) => {
        openDetail(game)
        onClose()
    }

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-void-pure/80 backdrop-blur-md z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={onClose}
                    />

                    {/* Drawer */}
                    <motion.div
                        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl z-50 overflow-hidden"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="h-full bg-void-pure border-l border-white/10 flex flex-col relative">
                            {/* Texture overlays */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0)_3px)] opacity-[0.1] pointer-events-none" />

                            {/* Header */}
                            <div className="relative px-8 py-8 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-void-pure to-void-pure/90">
                                <div>
                                    <div className="flex items-center gap-2 text-crimson-500 mb-1">
                                        <Trophy className="w-3.5 h-3.5" />
                                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase">
                                            {entries.length} {entries.length === 1 ? 'Game' : 'Games'}
                                        </span>
                                    </div>
                                    <h2 className="text-4xl font-display font-black text-white italic tracking-tighter uppercase transform -skew-x-6">
                                        Hunts
                                        <span className="text-white/20 ml-2">///</span>
                                    </h2>
                                </div>
                                <motion.button
                                    onClick={onClose}
                                    className="group relative p-4 hover:bg-white/5 transition-colors border border-white/10 hover:border-crimson-500/50"
                                    whileTap={{ scale: 0.95 }}
                                    transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
                                    aria-label="Close drawer"
                                >
                                    <X className="w-6 h-6 text-white/60 group-hover:text-crimson-500 transition-colors" />
                                    <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-crimson-500" />
                                    <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-crimson-500" />
                                </motion.button>
                            </div>

                            {/* Filter + Sort controls */}
                            <div className="relative px-8 py-5 border-b border-white/10 shrink-0 space-y-3 z-10">
                                <div className="flex items-center gap-2 flex-wrap">
                                    {FILTER_CHIPS.map((chip) => {
                                        const active = band === chip.id
                                        return (
                                            <button
                                                key={chip.id}
                                                onClick={() => setBand(chip.id)}
                                                className={`
                                                    px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-[0.15em]
                                                    border rounded-sm transition-[color,border-color,background-color] duration-200 ease-out
                                                    ${active
                                                        ? `${chip.accent.split(' hover:')[0]} bg-white/5`
                                                        : `text-white/30 border-white/10 hover:${chip.accent.split(' ').slice(0,1).join('')} ${chip.accent.split(' ').slice(2).join(' ')}`
                                                    }
                                                `}
                                            >
                                                {chip.label}
                                            </button>
                                        )
                                    })}
                                </div>

                                <div className="flex items-center gap-2 flex-wrap">
                                    <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                                        <ArrowUpDown className="w-3 h-3" />
                                        Sort
                                    </span>
                                    {SORT_CHIPS.map((chip) => {
                                        const active = sort === chip.id
                                        return (
                                            <button
                                                key={chip.id}
                                                onClick={() => setSort(chip.id)}
                                                className={`
                                                    px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.12em]
                                                    border rounded-sm transition-[color,border-color,background-color] duration-200 ease-out
                                                    ${active
                                                        ? 'text-crimson-300 border-crimson-700/50 bg-crimson-500/10'
                                                        : 'text-white/40 border-white/10 hover:text-white/70 hover:border-white/30'
                                                    }
                                                `}
                                            >
                                                {chip.label}
                                            </button>
                                        )
                                    })}
                                </div>
                            </div>

                            {/* List */}
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
                                                onClick={() => handleRowClick(entry.game)}
                                            />
                                        ))}
                                    </ul>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
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
