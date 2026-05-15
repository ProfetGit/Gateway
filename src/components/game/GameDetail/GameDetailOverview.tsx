import { motion } from 'framer-motion'
import { Calendar, Clock, Cpu, HardDrive, Trophy } from 'lucide-react'
import { FetchAchievementsResult, FetchGameDetailsResult } from '../../../types/game'
import { RequirementsCard, StatCard } from './StatCards'

interface GameDetailOverviewProps {
    gameDetails: FetchGameDetailsResult | null
    achievementsData: FetchAchievementsResult | null
    detailsLoading: boolean
    formattedPlaytime: string
    formattedLastPlayed: string
}

export function GameDetailOverview({
    gameDetails,
    achievementsData,
    detailsLoading,
    formattedPlaytime,
    formattedLastPlayed
}: GameDetailOverviewProps) {
    return (
        <motion.div
            key="overview"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
        >
            {/* Stats Grid */}
            <div className="grid grid-cols-4 gap-3">
                <StatCard
                    icon={<Clock size={16} className="text-crimson-500" />}
                    label="Playtime"
                    value={formattedPlaytime}
                />
                <StatCard
                    icon={<Calendar size={16} className="text-white/40" />}
                    label="Last Session"
                    value={formattedLastPlayed}
                />
                {gameDetails?.details?.metacriticScore && (
                    <StatCard
                        icon={<Trophy size={16} className={gameDetails.details.metacriticScore >= 75 ? 'text-emerald-500' : 'text-amber-500'} />}
                        label="Metacritic"
                        value={String(gameDetails.details.metacriticScore)}
                        highlight={gameDetails.details.metacriticScore >= 75 ? 'emerald' : 'amber'}
                    />
                )}
                {achievementsData?.totalAchievements && achievementsData.totalAchievements > 0 && (
                    <StatCard
                        icon={<Trophy size={16} className="text-white/40" />}
                        label="Achievements"
                        value={`${achievementsData.unlockedCount}/${achievementsData.totalAchievements}`}
                    />
                )}
            </div>

            {/* Description */}
            {gameDetails?.details?.shortDescription && (
                <motion.div
                    className="p-5 bg-void-surface/50 border border-void-border/30 rounded-lg relative overflow-hidden"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.1 }}
                >
                    {/* Corner accent */}
                    <div className="absolute top-0 left-0 w-6 h-6 border-t border-l border-crimson-500/40" />

                    <div className="flex items-center gap-2 mb-3">
                        <div className="w-0.5 h-4 bg-crimson-500 rounded-full" />
                        <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">About</span>
                    </div>
                    <p
                        className="select-text text-sm text-white/70 leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: gameDetails.details.shortDescription }}
                    />

                    {/* Genres */}
                    {gameDetails.details.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-4 pt-4 border-t border-void-border/30">
                            {gameDetails.details.genres.map(g => (
                                <span
                                    key={g}
                                    className="px-2 py-0.5 bg-void-border/30 border border-void-border/30 rounded text-[10px] font-mono uppercase tracking-wider text-white/50 hover:border-crimson-500/30 hover:text-white/70 transition-colors cursor-default"
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

            {/* Loading state */}
            {detailsLoading && (
                <div className="space-y-3">
                    <div className="h-20 bg-void-surface/50 rounded-lg animate-pulse" />
                    <div className="h-32 bg-void-surface/50 rounded-lg animate-pulse" />
                </div>
            )}
        </motion.div>
    )
}
