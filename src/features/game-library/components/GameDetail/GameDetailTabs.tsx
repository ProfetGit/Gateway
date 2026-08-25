import { AnimatePresence, motion } from 'framer-motion'
import { Gamepad2, Newspaper, Trophy } from 'lucide-react'
import { AchievementsTab } from '../AchievementsTab'
import { PatchNotesTab } from '../PatchNotesTab'
import { EmptyState } from './StatCards'
import { GameDetailOverview } from './GameDetailOverview'
import type { FetchGameDetailsResult, FetchNewsResult, Game } from '../../game-library-types'
import type { FetchAchievementsResult } from '@/features/achievements/api/achievements-schema'

export type GameDetailTabType = 'overview' | 'achievements' | 'patchnotes'

const TABS: GameDetailTabType[] = ['overview', 'achievements', 'patchnotes']

export type GameDetailTabsProps = {
    game: Game
    activeTab: GameDetailTabType
    setActiveTab: (t: GameDetailTabType) => void
    gameDetails: FetchGameDetailsResult | null
    detailsLoading: boolean
    achievementsData: FetchAchievementsResult | null
    achievementsLoading: boolean
    newsData: FetchNewsResult | null
    newsLoading: boolean
    formattedPlaytime: string
    formattedLastPlayed: string
}

export function GameDetailTabs({
    game, activeTab, setActiveTab, gameDetails, detailsLoading,
    achievementsData, achievementsLoading, newsData, newsLoading,
    formattedPlaytime, formattedLastPlayed,
}: GameDetailTabsProps) {
    return (
        <>
            {/* Tabs */}
            <div className="relative z-20 px-8 border-b border-void-border/30 bg-void-pure shrink-0">
                <div className="flex items-center gap-1">
                    {TABS.map((tab) => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            className={`relative px-4 py-3 flex items-center gap-2 transition-colors duration-100 ${
                                activeTab === tab ? 'text-white' : 'text-white/40 hover:text-white/70'
                            }`}
                        >
                            {tab === 'overview' && <Gamepad2 size={14} />}
                            {tab === 'achievements' && <Trophy size={14} />}
                            {tab === 'patchnotes' && <Newspaper size={14} />}
                            <span className="text-xs font-display font-bold uppercase tracking-wider">
                                {tab === 'patchnotes' ? 'News' : tab}
                            </span>
                            {activeTab === tab && (
                                <motion.div
                                    layoutId="tab-indicator"
                                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-crimson-500"
                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                />
                            )}
                        </button>
                    ))}
                </div>
            </div>

            {/* Tab Content */}
            <div className="flex-1 overflow-y-auto px-8 py-6 scrollbar-hide">
                <AnimatePresence mode="wait">
                    {activeTab === 'overview' && (
                        <GameDetailOverview
                            gameDetails={gameDetails}
                            achievementsData={achievementsData}
                            detailsLoading={detailsLoading}
                            formattedPlaytime={formattedPlaytime}
                            formattedLastPlayed={formattedLastPlayed}
                        />
                    )}
                    {activeTab === 'achievements' && (
                        <motion.div
                            key="achievements"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {game.steamAppId ? (
                                <AchievementsTab data={achievementsData} isLoading={achievementsLoading} />
                            ) : (
                                <EmptyState icon={<Trophy size={32} />} message="No achievements for this game" />
                            )}
                        </motion.div>
                    )}
                    {activeTab === 'patchnotes' && (
                        <motion.div
                            key="patchnotes"
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -10 }}
                        >
                            {game.steamAppId ? (
                                <PatchNotesTab data={newsData} isLoading={newsLoading} />
                            ) : (
                                <EmptyState icon={<Newspaper size={32} />} message="No news for this game" />
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </>
    )
}
