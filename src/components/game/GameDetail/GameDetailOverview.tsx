import { motion } from 'framer-motion'
import { Cpu, HardDrive, Trophy } from 'lucide-react'
import { FetchAchievementsResult, FetchGameDetailsResult } from '../../../types/game'
import { RequirementsCard } from './StatCards'

interface GameDetailOverviewProps {
    gameDetails: FetchGameDetailsResult | null
    achievementsData: FetchAchievementsResult | null
    detailsLoading: boolean
    formattedPlaytime: string
    formattedLastPlayed: string
}

function InlineStat({
    label,
    value,
    accent
}: {
    label: string
    value: string
    accent?: 'crimson' | 'emerald' | 'amber'
}) {
    const valueColor =
        accent === 'crimson' ? 'text-crimson-400' :
        accent === 'emerald' ? 'text-emerald-400' :
        accent === 'amber' ? 'text-amber-400' :
        'text-white/80'

    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/25">{label}</span>
            <span className={`text-base font-display font-bold ${valueColor}`}>{value}</span>
        </div>
    )
}

export function GameDetailOverview({
    gameDetails,
    achievementsData,
    detailsLoading,
    formattedPlaytime,
    formattedLastPlayed
}: GameDetailOverviewProps) {
    const hasStats =
        formattedPlaytime !== '0h' ||
        formattedLastPlayed !== 'Never' ||
        !!gameDetails?.details?.metacriticScore ||
        (achievementsData?.totalAchievements ?? 0) > 0

    return (
        <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-8"
        >
            {/* Inline stat row — replaces the 4-card grid */}
            {hasStats && (
                <div className="flex items-center gap-8 pb-6 border-b border-void-border/20">
                    <InlineStat
                        label="Playtime"
                        value={formattedPlaytime}
                        accent={formattedPlaytime !== '0h' ? 'crimson' : undefined}
                    />
                    <div className="w-px h-10 bg-void-border/20 shrink-0" />
                    <InlineStat label="Last session" value={formattedLastPlayed} />
                    {gameDetails?.details?.metacriticScore != null && (
                        <>
                            <div className="w-px h-10 bg-void-border/20 shrink-0" />
                            <InlineStat
                                label="Metacritic"
                                value={String(gameDetails.details.metacriticScore)}
                                accent={gameDetails.details.metacriticScore >= 75 ? 'emerald' : 'amber'}
                            />
                        </>
                    )}
                    {achievementsData && achievementsData.totalAchievements > 0 && (
                        <>
                            <div className="w-px h-10 bg-void-border/20 shrink-0" />
                            <div className="flex flex-col gap-0.5">
                                <span className="text-[9px] font-mono uppercase tracking-widest text-white/25">Achievements</span>
                                <div className="flex items-baseline gap-1.5">
                                    <span className="text-base font-display font-bold text-white/80">
                                        {achievementsData.unlockedCount}
                                    </span>
                                    <span className="text-[10px] font-mono text-white/30">
                                        / {achievementsData.totalAchievements}
                                    </span>
                                    <Trophy size={11} className="text-white/25 mb-0.5" />
                                </div>
                            </div>
                        </>
                    )}
                </div>
            )}

            {/* Loading skeleton */}
            {detailsLoading && (
                <div className="space-y-3">
                    <div className="h-16 bg-void-surface/40 animate-pulse" />
                    <div className="h-28 bg-void-surface/40 animate-pulse" />
                </div>
            )}

            {/* Description */}
            {gameDetails?.details?.shortDescription && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    <p className="text-[9px] font-mono uppercase tracking-widest text-white/25 mb-3">About</p>
                    <p
                        className="select-text text-sm text-white/70 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: gameDetails.details.shortDescription }}
                    />

                    {/* Genres */}
                    {gameDetails.details.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-5">
                            {gameDetails.details.genres.map(g => (
                                <span
                                    key={g}
                                    className="px-2 py-0.5 border border-void-border/30 text-[10px] font-mono uppercase tracking-wider text-white/40 hover:border-crimson-500/30 hover:text-white/60 transition-colors duration-100 cursor-default"
                                >
                                    {g}
                                </span>
                            ))}
                        </div>
                    )}
                </motion.div>
            )}

            {/* System Requirements */}
            {gameDetails?.details?.pcRequirements?.minimum && (
                <div className="grid grid-cols-2 gap-4">
                    <RequirementsCard
                        title="Minimum"
                        icon={<Cpu size={14} />}
                        color="crimson"
                        html={gameDetails.details.pcRequirements.minimum}
                    />
                    {gameDetails.details.pcRequirements.recommended && (
                        <RequirementsCard
                            title="Recommended"
                            icon={<HardDrive size={14} />}
                            color="emerald"
                            html={gameDetails.details.pcRequirements.recommended}
                        />
                    )}
                </div>
            )}
        </motion.div>
    )
}
