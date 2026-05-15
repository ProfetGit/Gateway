import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import {
    X,
    Gamepad2,
    Trophy,
    Newspaper
} from 'lucide-react'
import { useGameStore } from '../../../stores/gameStore'
import { useState, useMemo, useCallback } from 'react'
import { AchievementsTab } from '../AchievementsTab'
import { PatchNotesTab } from '../PatchNotesTab'
import { TabType } from './types'
import {
    backdropVariants,
    containerVariants,
} from './animations'
import { EmptyState } from './StatCards'
import { useGameDetailData } from './useGameDetailData'
import { GameDetailSidebar } from './GameDetailSidebar'
import { GameDetailHero } from './GameDetailHero'
import { GameDetailOverview } from './GameDetailOverview'

export function GameDetail() {
    const { selectedGame, isDetailOpen, closeDetail, toggleFavorite, deleteGame, updateGame } = useGameStore()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isInstalling, setIsInstalling] = useState(false)
    const [activeTab, setActiveTab] = useState<TabType>('overview')

    // Data Fetching Hook
    const {
        achievementsData,
        achievementsLoading,
        newsData,
        newsLoading,
        gameDetails,
        detailsLoading,
        imgSrc,
        bannerSrc,
        setImgSrc,
        setBannerSrc
    } = useGameDetailData(selectedGame, activeTab)

    // ═══════════════════════════════════════════════════════════════════════════════
    // MEMOIZED HANDLERS
    // ═══════════════════════════════════════════════════════════════════════════════
    const handlePlay = useCallback(async () => {
        if (selectedGame) window.api?.launchGame(selectedGame)
    }, [selectedGame])

    const handleInstall = useCallback(async () => {
        if (!selectedGame) return
        setIsInstalling(true)
        try {
            if (selectedGame.steamAppId) await window.api?.installSteamGame(selectedGame.steamAppId)
            else if (selectedGame.heroicAppName) await window.api?.installHeroicGame(selectedGame.heroicAppName, selectedGame.heroicRunner)
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
    }, [selectedGame?.steamAppId, bannerSrc])

    // ═══════════════════════════════════════════════════════════════════════════════
    // MEMOIZED COMPUTED VALUES
    // ═══════════════════════════════════════════════════════════════════════════════
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
            : 'Get it now'
    }, [selectedGame?.sizeOnDisk])


    if (!selectedGame) return null

    return (
        <AnimatePresence mode="wait">
            {isDetailOpen && (
                <MotionConfig reducedMotion="user">
                    {/* Backdrop - OLED black with blur */}
                    <motion.div
                        className="fixed inset-0 bg-void-pure/90 backdrop-blur-xl z-50 will-change-[opacity]"
                        variants={backdropVariants}
                        initial="hidden"
                        animate="visible"
                        exit="hidden"
                        transition={{ duration: 0.2 }}
                        onClick={closeDetail}
                    />

                    {/* Main Container */}
                    <motion.div
                        className="fixed inset-6 z-50 flex overflow-hidden bg-void-pure border border-void-border/50 rounded-lg shadow-void-float will-change-transform"
                        variants={containerVariants}
                        initial="hidden"
                        animate="visible"
                        exit="exit"
                        transition={{ type: "spring", damping: 35, stiffness: 400 }}
                    >
                        {/* Corner brackets — matches GameCard design */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-crimson-500/50 pointer-events-none z-50 rounded-tl-lg" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-crimson-500/50 pointer-events-none z-50 rounded-tr-lg" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-crimson-500/50 pointer-events-none z-50 rounded-br-lg" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-crimson-500/50 pointer-events-none z-50 rounded-bl-lg" />

                        {/* LEFT PANEL */}
                        <GameDetailSidebar
                            selectedGame={selectedGame}
                            imgSrc={imgSrc}
                            gameDetails={gameDetails}
                            isDeleting={isDeleting}
                            toggleFavorite={toggleFavorite}
                            updateGame={updateGame}
                            handleDelete={handleDelete}
                            handleImageError={handleImageError}
                        />

                        {/* RIGHT PANEL: Content */}
                        <div className="flex-1 flex flex-col relative overflow-hidden">
                            {/* Close Button */}
                            <motion.button
                                onClick={closeDetail}
                                className="absolute top-4 right-4 z-50 p-2 rounded-lg bg-void-surface/80 backdrop-blur text-white/40 hover:text-white hover:bg-crimson-600 border border-void-border/30 transition-all duration-200"
                                whileHover={{ scale: 1.15 }}
                                whileTap={{ scale: 0.95 }}
                                transition={{ type: "spring", stiffness: 600, damping: 20 }}
                            >
                                <X size={18} />
                            </motion.button>

                            {/* Hero Banner */}
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

                            {/* Tabs */}
                            <div className="relative z-20 px-6 border-b border-void-border/30 bg-void-pure/80 backdrop-blur-sm">
                                <div className="flex items-center gap-1">
                                    {(['overview', 'achievements', 'patchnotes'] as TabType[]).map((tab) => (
                                        <button
                                            key={tab}
                                            onClick={() => setActiveTab(tab)}
                                            className={`relative px-4 py-3 flex items-center gap-2 transition-colors ${activeTab === tab
                                                ? 'text-white'
                                                : 'text-white/40 hover:text-white/70'
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
                                                    className="absolute bottom-0 left-2 right-2 h-0.5 bg-crimson-500 rounded-full"
                                                    transition={{ type: "spring", stiffness: 400, damping: 30 }}
                                                />
                                            )}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            {/* Tab Content */}
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
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
                        </div>
                    </motion.div>
                </MotionConfig>
            )}
        </AnimatePresence>
    )
}
