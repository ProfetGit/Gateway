import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { X, Gamepad2, Trophy, Newspaper } from 'lucide-react'
import { useGameStore } from '../../../stores/gameStore'
import { useState, useMemo, useCallback } from 'react'
import { AchievementsTab } from '../AchievementsTab'
import { PatchNotesTab } from '../PatchNotesTab'
import { TabType } from './types'
import { backdropVariants, containerVariants } from './animations'
import { EmptyState } from './StatCards'
import { useGameDetailData } from './useGameDetailData'
import { GameDetailHero } from './GameDetailHero'
import { GameDetailMetaStrip } from './GameDetailSidebar'
import { GameDetailOverview } from './GameDetailOverview'

export function GameDetail() {
    const { selectedGame, isDetailOpen, closeDetail, toggleFavorite, deleteGame } = useGameStore()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isInstalling, setIsInstalling] = useState(false)
    const [activeTab, setActiveTab] = useState<TabType>('overview')

    const {
        achievementsData, achievementsLoading, newsData, newsLoading,
        gameDetails, detailsLoading, imgSrc, bannerSrc, setImgSrc, setBannerSrc
    } = useGameDetailData(selectedGame, activeTab)

    const handlePlay = useCallback(async () => {
        if (selectedGame) window.api?.launchGame(selectedGame)
    }, [selectedGame])

    const handleInstall = useCallback(async () => {
        if (!selectedGame) return
        setIsInstalling(true)
        try {
            if (selectedGame.steamAppId) await window.api?.installSteamGame(selectedGame.steamAppId)
        } catch (err) { console.error(err) }
        finally { setTimeout(() => setIsInstalling(false), 2000) }
    }, [selectedGame])

    const handleDelete = useCallback(async () => {
        if (!selectedGame) return
        if (isDeleting) {
            await window.api?.deleteGame(selectedGame.id)
            deleteGame(selectedGame.id)
            closeDetail()
        } else {
            setIsDeleting(true)
            setTimeout(() => setIsDeleting(false), 3000)
        }
    }, [selectedGame, isDeleting, deleteGame, closeDetail])

    const handleImageError = useCallback(() => {
        if (!selectedGame?.steamAppId || !imgSrc) return
        if (imgSrc.includes('library_600x900_2x.jpg')) {
            setImgSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${selectedGame.steamAppId}/library_600x900.jpg`)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGame?.steamAppId, imgSrc])

    const handleBannerError = useCallback(() => {
        if (!selectedGame?.steamAppId || !bannerSrc) {
            setBannerSrc(undefined)
            return
        }
        if (bannerSrc.includes('library_hero.jpg')) {
            setBannerSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${selectedGame.steamAppId}/header.jpg`)
        } else {
            setBannerSrc(undefined)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGame?.steamAppId, bannerSrc])

    const formattedPlaytime = useMemo(() => {
        if (!selectedGame?.playtime) return '0h'
        const hours = Math.floor(selectedGame.playtime / 60)
        const minutes = selectedGame.playtime % 60
        if (hours === 0) return `${minutes}m`
        if (minutes === 0) return `${hours}h`
        return `${hours}h ${minutes}m`
    }, [selectedGame?.playtime])

    const formattedLastPlayed = useMemo(() => {
        return selectedGame?.lastPlayed
            ? new Date(selectedGame.lastPlayed).toLocaleDateString()
            : 'Never'
    }, [selectedGame?.lastPlayed])

    const formattedSize = useMemo(() => {
        return selectedGame?.sizeOnDisk
            ? `${(selectedGame.sizeOnDisk / 1073741824).toFixed(1)} GB`
            : undefined
    }, [selectedGame?.sizeOnDisk])

    if (!selectedGame) return null

    return (
        <AnimatePresence mode="wait">
            {isDetailOpen && (
                <MotionConfig reducedMotion="user">
                    <motion.div
                        className="fixed inset-0 bg-void-pure/90 backdrop-blur-xl z-50 will-change-[opacity]"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ duration: 0.2 }}
                        onClick={closeDetail}
                    />

                    <motion.div
                        className="fixed inset-6 z-50 flex flex-col overflow-hidden bg-void-pure border border-void-border/50 shadow-void-float will-change-transform"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ type: "spring", damping: 35, stiffness: 400 }}
                    >
                        {/* Corner brackets */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-crimson-500/50 pointer-events-none z-50" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-crimson-500/50 pointer-events-none z-50" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-crimson-500/50 pointer-events-none z-50" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-crimson-500/50 pointer-events-none z-50" />

                        {/* Close */}
                        <motion.button
                            onClick={closeDetail}
                            className="absolute top-4 right-4 z-50 p-2 bg-void-surface/80 backdrop-blur text-white/40 hover:text-white hover:bg-crimson-600 border border-void-border/30 transition-all duration-100"
                            whileHover={{ scale: 1.1 }}
                            whileTap={{ scale: 0.95 }}
                        >
                            <X size={18} />
                        </motion.button>

                        {/* Cover card — breaches the hero/content seam */}
                        {/* top-72 = hero height (288px). translate-y-1/2 pulls it up so 50% is in hero. */}
                        <motion.div
                            className="absolute left-8 top-72 -translate-y-1/2 z-30 w-36 overflow-hidden border border-void-border/60 shadow-void-float pointer-events-none"
                            style={{ aspectRatio: '3 / 4' }}
                            initial={{ opacity: 0, y: 16 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.12, duration: 0.3 }}
                        >
                            {imgSrc ? (
                                <img
                                    src={imgSrc}
                                    className="w-full h-full object-cover pointer-events-auto"
                                    onError={handleImageError}
                                    alt={selectedGame.title}
                                />
                            ) : (
                                <div className="w-full h-full bg-void-surface flex items-center justify-center pointer-events-auto">
                                    <span className="text-4xl font-display font-black text-white/5">
                                        {selectedGame.title.charAt(0)}
                                    </span>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none" />
                            {/* The breach line — crimson rule at the seam */}
                            <div className="absolute top-1/2 inset-x-0 h-px bg-crimson-500/60 pointer-events-none" />
                            {selectedGame.isInstalled && (
                                <div className="absolute bottom-0 inset-x-0 flex items-center gap-1 px-2 py-1 bg-black/70">
                                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                    <span className="text-[8px] font-mono uppercase tracking-wider text-emerald-400">Installed</span>
                                </div>
                            )}
                        </motion.div>

                        {/* Seam line — full-width hairline at hero/content boundary */}
                        <div className="absolute top-72 inset-x-0 h-px bg-crimson-500/20 z-20 pointer-events-none" />

                        {/* Hero — cinematic, dominant */}
                        <GameDetailHero
                            selectedGame={selectedGame}
                            bannerSrc={bannerSrc}
                            gameDetails={gameDetails}
                            isInstalling={isInstalling}
                            handlePlay={handlePlay}
                            handleInstall={handleInstall}
                            handleBannerError={handleBannerError}
                            formattedSize={formattedSize}
                        />

                        {/* Meta strip — inline data + secondary actions, clears cover card */}
                        <GameDetailMetaStrip
                            selectedGame={selectedGame}
                            gameDetails={gameDetails}
                            formattedPlaytime={formattedPlaytime}
                            formattedLastPlayed={formattedLastPlayed}
                            formattedSize={formattedSize}
                            isDeleting={isDeleting}
                            toggleFavorite={toggleFavorite}
                            handleDelete={handleDelete}
                        />

                        {/* Tabs */}
                        <div className="relative z-20 px-8 border-b border-void-border/30 bg-void-pure shrink-0">
                            <div className="flex items-center gap-1">
                                {(['overview', 'achievements', 'patchnotes'] as TabType[]).map((tab) => (
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
                                        {selectedGame.steamAppId ? (
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
                                        {selectedGame.steamAppId ? (
                                            <PatchNotesTab data={newsData} isLoading={newsLoading} />
                                        ) : (
                                            <EmptyState icon={<Newspaper size={32} />} message="No news for this game" />
                                        )}
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </motion.div>
                </MotionConfig>
            )}
        </AnimatePresence>
    )
}
