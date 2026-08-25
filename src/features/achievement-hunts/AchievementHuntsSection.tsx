import React from 'react'
import { motion } from 'framer-motion'
import { Trophy, Target, ArrowUpRight } from 'lucide-react'
import { AchievementHuntCard } from '@/components/ui/cards/AchievementHuntCard'
import { useGameStore } from '@/features/game-library/game-store'
import { useAchievementsStore } from './achievements-store'

// Show the top N closest-to-finishing games. Upper bound is "not yet 100%
// done" — checked via unlocked < total so rounding can't push a near-complete
// game out. No lower threshold so the grid reliably fills 4 cards.
const TOP_N = 4

export function AchievementHuntsSection() {
    const libraryGames = useGameStore((s) => s.games)
    const openDetail = useGameStore((s) => s.openDetail)
    const openHuntsDrawer = useGameStore((s) => s.openHuntsDrawer)
    const progressMap = useAchievementsStore((s) => s.progress)
    const fetchForAppIds = useAchievementsStore((s) => s.fetchForAppIds)

    // Played Steam games only. Filtering reasoning:
    //   - Unplayed games have 0% achievements by definition — they never
    //     qualify for any meaningful Hunt band, AND they bloat the fetch
    //     queue from ~100 (typical) to 500+ games.
    //   - Achievement progress persists across install cycles, so we DON'T
    //     filter on isInstalled. The "uninstalled at 87% — remind me" use
    //     case still works as long as playtime > 0.
    //
    // Sorted by playtime desc so the most-played games hit the parallel
    // fetch workers first → the top-3 home cards populate in seconds while
    // long-tail games fill in the background.
    const eligibleGames = React.useMemo(() => {
        return libraryGames
            .filter((g) => g.steamAppId && (g.playtime ?? 0) > 0)
            .sort((a, b) => (b.playtime ?? 0) - (a.playtime ?? 0))
    }, [libraryGames])

    // Fire fetch on mount and whenever the eligible set changes (e.g. user
    // syncs library). Store handles dedupe + TTL + concurrency.
    React.useEffect(() => {
        if (eligibleGames.length === 0) return
        const appIds = eligibleGames.map((g) => g.steamAppId!).filter(Boolean)
        fetchForAppIds(appIds)
    }, [eligibleGames, fetchForAppIds])

    // Compute the qualifying games inside the progress band.
    const qualifyingGames = React.useMemo(() => {
        return eligibleGames
            .map((game) => {
                const entry = progressMap[game.steamAppId!]
                if (!entry || entry.total === 0) return null
                if (entry.unlocked >= entry.total) return null
                return { game, ...entry }
            })
            .filter((x): x is NonNullable<typeof x> => x !== null)
            .sort((a, b) => b.percentage - a.percentage)
    }, [eligibleGames, progressMap])

    const huntGames = qualifyingGames.slice(0, TOP_N)

    // Auto-hide when nothing qualifies. We deliberately also hide while
    // initial fetches are pending — a flickering empty section is worse
    // than a quiet one.
    if (huntGames.length === 0) {
        return null
    }

    const avgPct = Math.round(
        huntGames.reduce((acc, g) => acc + g.percentage, 0) / huntGames.length
    )

    return (
        <motion.section
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.2 }}
            className="relative"
        >
            {/* Section Header */}
            <div className="flex items-center justify-between mb-3 group/header">
                <div className="flex items-center gap-4">
                    {/* Animated trophy icon */}
                    <motion.div
                        animate={{
                            scale: [1, 1.08, 1],
                            rotate: [0, 4, -4, 0],
                        }}
                        transition={{
                            duration: 3,
                            repeat: Infinity,
                            ease: 'easeInOut',
                        }}
                    >
                        <Trophy className="w-5 h-5 text-crimson-500" />
                    </motion.div>

                    <h2 className="text-2xl font-display font-black text-white italic tracking-tighter uppercase flex items-center gap-3">
                        Achievement Hunts
                        <span className="text-xs font-mono font-medium tracking-[0.1em] text-crimson-400/90 px-2 py-0.5 border border-crimson-500/30 rounded flex items-center gap-1.5 bg-crimson-500/10">
                            <Target className="w-3 h-3" />
                            {avgPct}% on average
                        </span>
                    </h2>
                </div>

                {/* Decorative line */}
                <div className="flex-1 h-px bg-gradient-to-r from-crimson-900/40 via-crimson-900/20 to-transparent mx-8" />

                {/* View all → opens drawer with full sortable/filterable list */}
                <button
                    onClick={openHuntsDrawer}
                    className="group shrink-0 flex items-center gap-2 px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-[0.18em] text-white/60 border border-white/15 rounded-sm hover:text-crimson-300 hover:border-crimson-500/60 hover:bg-crimson-500/5 transition-[color,border-color,background-color] duration-200 ease-out"
                >
                    View all
                    <ArrowUpRight className="w-3.5 h-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                </button>
            </div>

            {/* Sub-line: lightweight orientation */}
            <p className="text-[11px] font-mono uppercase tracking-[0.2em] text-white/40 mb-4">
                Closest to finishing · click to open
            </p>

            {/* 4-card grid */}
            <div className="grid grid-cols-4 gap-4">
                {huntGames.map((entry, index) => (
                    <AchievementHuntCard
                        key={entry.game.id}
                        game={entry.game}
                        unlocked={entry.unlocked}
                        total={entry.total}
                        percentage={entry.percentage}
                        index={index}
                        onClick={() => openDetail(entry.game)}
                    />
                ))}
            </div>

        </motion.section>
    )
}
