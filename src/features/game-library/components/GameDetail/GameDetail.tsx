import { useCallback, useMemo, useState } from 'react'
import { AnimatePresence, motion, MotionConfig } from 'framer-motion'
import { X } from 'lucide-react'
import { CornerBrackets } from '@/components/ui/CornerBrackets'
import { AchievementsSurface } from '@/features/achievements/AchievementsSurface'
import { computeCompletionPercent } from '@/features/achievements/achievement-progress'
import { useGameStore } from '../../game-store'
import { launchGameWithFeedback } from '../../launch-game-with-feedback'
import { installSteamGame } from '../../api/install-steam-game'
import { deleteGame as apiDeleteGame } from '../../api/delete-game'
import { getMetadataAppId } from '../../get-metadata-app-id'
import { AchievementTrackingPanel } from '../AchievementTrackingPanel'
import type { NewsItem } from '../../game-news-types'
import { GameDetailNewsReader } from './GameDetailNewsReader'
import { backdropVariants, shellVariants } from './game-detail-animations'
import { useGameDetailData } from './use-game-detail-data'
import { GameDetailPanel } from './GameDetailPanel'
import { GameDetailRail } from './GameDetailRail'

export function GameDetail() {
    const { selectedGame, isDetailOpen, closeDetail, deleteGame } = useGameStore()
    const isAchievementsOpen = useGameStore((s) => s.isAchievementsOpen)
    const openAchievements = useGameStore((s) => s.openAchievements)
    const closeAchievements = useGameStore((s) => s.closeAchievements)

    const [isDeleting, setIsDeleting] = useState(false)
    const [isInstalling, setIsInstalling] = useState(false)
    const [openNews, setOpenNews] = useState<NewsItem | null>(null)

    const {
        achievementsData, achievementsLoading, toggleAchievement, isManualAchievements,
        newsData, newsLoading, gameDetails, detailsLoading, imgSrc, bannerSrc, setImgSrc,
    } = useGameDetailData(selectedGame, isDetailOpen)

    const metadataAppId = getMetadataAppId(selectedGame)

    const handlePrimary = useCallback(async () => {
        if (!selectedGame) return
        if (selectedGame.isInstalled) {
            await launchGameWithFeedback(selectedGame)
            return
        }
        setIsInstalling(true)
        try {
            if (selectedGame.steamAppId) await installSteamGame(selectedGame.steamAppId)
        } finally {
            setTimeout(() => setIsInstalling(false), 2000)
        }
    }, [selectedGame])

    const handleDelete = useCallback(async () => {
        if (!selectedGame) return
        if (!isDeleting) {
            setIsDeleting(true)
            setTimeout(() => setIsDeleting(false), 3000)
            return
        }
        await apiDeleteGame(selectedGame.id)
        deleteGame(selectedGame.id)
        closeDetail()
    }, [selectedGame, isDeleting, deleteGame, closeDetail])

    const handleCoverError = useCallback(() => {
        if (!imgSrc) return
        if (metadataAppId && imgSrc.includes('library_600x900_2x.jpg')) {
            setImgSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${metadataAppId}/library_600x900.jpg`)
        } else {
            setImgSrc(undefined)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [metadataAppId, imgSrc])

    const playtimeHours = Math.floor((selectedGame?.playtime ?? 0) / 60)

    const lastPlayed = useMemo(
        () => (selectedGame?.lastPlayed ? new Date(selectedGame.lastPlayed).toLocaleDateString() : 'Never'),
        [selectedGame?.lastPlayed]
    )
    const size = useMemo(
        () => (selectedGame?.sizeOnDisk ? `${(selectedGame.sizeOnDisk / 1073741824).toFixed(1)} GB` : undefined),
        [selectedGame?.sizeOnDisk]
    )

    if (!selectedGame) return null

    const unlocked = achievementsData?.unlockedCount ?? 0
    const total = achievementsData?.totalAchievements ?? 0
    const percentage = computeCompletionPercent(unlocked, total)

    return (
        <AnimatePresence mode="wait">
            {isDetailOpen && (
                <MotionConfig reducedMotion="user">
                    <motion.div
                        key="backdrop"
                        className="fixed inset-0 z-50 bg-void-pure/90 backdrop-blur-xl"
                        variants={backdropVariants}
                        initial="hidden" animate="visible" exit="exit"
                        onClick={closeDetail}
                    />

                    <motion.div
                        key="shell"
                        className="fixed inset-6 z-50 flex overflow-hidden bg-void-pure border border-void-border/50 shadow-void-float"
                        variants={shellVariants}
                        initial="hidden" animate="visible" exit="exit"
                    >
                        <CornerBrackets colorClass="border-crimson-500/60" size={30} thickness={2} className="z-50" />

                        <motion.button
                            onClick={closeDetail}
                            aria-label="Close"
                            className="absolute top-4 right-4 z-50 p-2 bg-void-surface/80 backdrop-blur text-white/40 border border-void-border/30 hover:text-white hover:bg-crimson-600 transition-colors duration-100 ease-out-expo"
                            whileHover={{ scale: 1.08 }}
                            whileTap={{ scale: 0.95 }}
                            transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
                        >
                            <X size={18} />
                        </motion.button>

                        <GameDetailRail
                            game={selectedGame}
                            coverSrc={imgSrc}
                            onCoverError={handleCoverError}
                            playtimeHours={playtimeHours}
                            completion={percentage}
                            hasAchievements={total > 0}
                            lastPlayed={lastPlayed}
                            size={size}
                            released={gameDetails?.details?.releaseDate}
                            isInstalling={isInstalling}
                            isDeleting={isDeleting}
                            onPrimary={() => void handlePrimary()}
                            onDelete={() => void handleDelete()}
                        />

                        <GameDetailPanel
                            details={gameDetails}
                            detailsLoading={detailsLoading}
                            achievements={achievementsData?.achievements ?? []}
                            achievementsLoading={achievementsLoading}
                            unlocked={unlocked}
                            total={total}
                            percentage={percentage}
                            news={newsData?.news ?? []}
                            newsLoading={newsLoading}
                            bannerSrc={bannerSrc}
                            onOpenAchievements={openAchievements}
                            onSelectNews={setOpenNews}
                        />
                    </motion.div>

                    {/* Siblings of the shell, not children: these layer over the
                        whole overlay and must not inherit its clipping. */}
                    <GameDetailNewsReader key="news" item={openNews} onClose={() => setOpenNews(null)} />

                    <AchievementsSurface
                        key="achievements"
                        isOpen={isAchievementsOpen}
                        onClose={closeAchievements}
                        title="Achievements"
                        subtitle={selectedGame.title}
                        achievements={achievementsData?.achievements ?? []}
                        unlocked={unlocked}
                        total={total}
                        isLoading={achievementsLoading}
                        emptyMessage="No achievements for this one"
                        onToggleAchievement={toggleAchievement}
                        banner={isManualAchievements ? <AchievementTrackingPanel gameId={selectedGame.id} /> : undefined}
                    />
                </MotionConfig>
            )}
        </AnimatePresence>
    )
}
