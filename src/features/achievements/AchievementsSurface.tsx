import React from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { Trophy } from 'lucide-react'
import type { Achievement } from './api/achievements-schema'
import type { AchievementGameSummary } from './achievements-surface-types'
import { AchievementTile } from './AchievementTile'
import { AchievementGameRow } from './AchievementGameRow'
import { AchievementsSkeletonGrid } from './AchievementsSkeletonGrid'
import { AchievementsSurfaceHeader } from './AchievementsSurfaceHeader'
import { selectAchievements, type AchievementFilter } from './rank-achievements'

export type AchievementsSurfaceProps = {
    isOpen: boolean
    onClose: () => void
    title: string
    subtitle?: string
    /** Per-game mode. Mutually exclusive with `games`. */
    achievements?: Achievement[]
    /** Hunts mode: a ranked list of games to drill into. */
    games?: AchievementGameSummary[]
    unlocked?: number
    total?: number
    isLoading?: boolean
    emptyMessage?: string
    onToggleAchievement?: (apiname: string) => void
    onSelectGame?: (id: string) => void
    /** Manual-tracking controls, rendered above the list when present. */
    banner?: React.ReactNode
}

export function AchievementsSurface({
    isOpen, onClose, title, subtitle, achievements, games,
    unlocked = 0, total = 0, isLoading = false, emptyMessage = 'Nothing to show yet',
    onToggleAchievement, onSelectGame, banner,
}: AchievementsSurfaceProps) {
    const [filter, setFilter] = React.useState<AchievementFilter>('next')
    const [query, setQuery] = React.useState('')
    const huntsMode = games !== undefined

    React.useEffect(() => {
        if (!isOpen) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [isOpen, onClose])

    // A stale filter would silently hide everything when reopening on another
    // game, so reset whenever the surface's subject changes.
    React.useEffect(() => { setFilter('next'); setQuery('') }, [subtitle, huntsMode])

    const rows = React.useMemo(
        () => (achievements ? selectAchievements(achievements, filter, query) : []),
        [achievements, filter, query]
    )
    const gameRows = React.useMemo(() => {
        if (!games) return []
        const needle = query.trim().toLowerCase()
        return needle ? games.filter((g) => g.title.toLowerCase().includes(needle)) : games
    }, [games, query])

    const isEmpty = !isLoading && (huntsMode ? gameRows.length === 0 : rows.length === 0)

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 z-[60] bg-void-pure/85 backdrop-blur-md"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        onClick={onClose}
                    />
                    <motion.aside
                        className="fixed inset-y-0 right-0 z-[61] w-full max-w-[1080px] flex flex-col bg-void-pure border-l border-void-border shadow-void-float"
                        initial={{ x: '4%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '3%', opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <AchievementsSurfaceHeader
                            title={title}
                            subtitle={subtitle}
                            unlocked={unlocked}
                            total={total}
                            filter={filter}
                            onFilter={setFilter}
                            query={query}
                            onQuery={setQuery}
                            onClose={onClose}
                            showFilters={!huntsMode}
                        />

                        {banner && <div className="shrink-0 px-7 pt-4">{banner}</div>}

                        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] px-7 py-5">
                            <div className="grid gap-3 [grid-template-columns:repeat(auto-fill,minmax(300px,1fr))] content-start">
                                {isLoading && <AchievementsSkeletonGrid />}

                                {!isLoading && huntsMode && gameRows.map((game, i) => (
                                    <AchievementGameRow
                                        key={game.id}
                                        game={game}
                                        index={i}
                                        onClick={() => onSelectGame?.(game.id)}
                                    />
                                ))}

                                {!isLoading && !huntsMode && rows.map((a, i) => (
                                    <AchievementTile
                                        key={a.apiname}
                                        achievement={a}
                                        index={i}
                                        rank={filter === 'next' && i < 3 ? i + 1 : undefined}
                                        onToggle={onToggleAchievement ? () => onToggleAchievement(a.apiname) : undefined}
                                    />
                                ))}
                            </div>

                            {isEmpty && (
                                <div className="flex flex-col items-center justify-center py-24 text-center">
                                    <Trophy className="w-8 h-8 text-white/15 mb-4" />
                                    <p className="text-sm font-mono uppercase tracking-[0.18em] text-white/35">
                                        {query ? 'Nothing matches that search' : emptyMessage}
                                    </p>
                                </div>
                            )}
                        </div>
                    </motion.aside>
                </>
            )}
        </AnimatePresence>
    )
}
