import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Trophy } from 'lucide-react'
import { useGameStore } from '@/features/game-library/game-store'
import { useAchievementsStore } from './achievements-store'
import type { Game } from '@/features/game-library/game-library-types'
import { AchievementHuntsFilters, type FilterBand, type SortMode } from './AchievementHuntsFilters'
import { AchievementHuntsList, type HuntEntry } from './AchievementHuntsList'

function matchesBand(p: HuntEntry['progress'], band: FilterBand): boolean {
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

                            <AchievementHuntsFilters band={band} setBand={setBand} sort={sort} setSort={setSort} />

                            <AchievementHuntsList entries={entries} band={band} onRowClick={handleRowClick} />
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
