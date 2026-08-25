import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import { X } from 'lucide-react'
import { useGameStore } from '../../game-store'
import { launchGame } from '../../api/launch-game'
import { installSteamGame } from '../../api/install-steam-game'
import { deleteGame as apiDeleteGame } from '../../api/delete-game'
import { useState, useMemo, useCallback } from 'react'
import { backdropVariants, containerVariants } from './game-detail-animations'
import { useGameDetailData } from './use-game-detail-data'
import { getMetadataAppId } from '../../get-metadata-app-id'
import { GameDetailHero } from './GameDetailHero'
import { GameDetailMetaStrip } from './GameDetailSidebar'
import { GameDetailCoverCard } from './GameDetailCoverCard'
import { GameDetailTabs, type GameDetailTabType } from './GameDetailTabs'

export function GameDetail() {
    const { selectedGame, isDetailOpen, closeDetail, toggleFavorite, deleteGame } = useGameStore()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isInstalling, setIsInstalling] = useState(false)
    const [activeTab, setActiveTab] = useState<GameDetailTabType>('overview')

    const {
        achievementsData, achievementsLoading, toggleAchievement, isManualAchievements,
        newsData, newsLoading,
        gameDetails, detailsLoading, imgSrc, bannerSrc, setImgSrc, setBannerSrc
    } = useGameDetailData(selectedGame, activeTab)

    const handlePlay = useCallback(async () => {
        if (selectedGame) launchGame(selectedGame)
    }, [selectedGame])

    const handleInstall = useCallback(async () => {
        if (!selectedGame) return
        setIsInstalling(true)
        try {
            if (selectedGame.steamAppId) await installSteamGame(selectedGame.steamAppId)
        } catch (err) { console.error(err) }
        finally { setTimeout(() => setIsInstalling(false), 2000) }
    }, [selectedGame])

    const handleDelete = useCallback(async () => {
        if (!selectedGame) return
        if (isDeleting) {
            await apiDeleteGame(selectedGame.id)
            deleteGame(selectedGame.id)
            closeDetail()
        } else {
            setIsDeleting(true)
            setTimeout(() => setIsDeleting(false), 3000)
        }
    }, [selectedGame, isDeleting, deleteGame, closeDetail])

    const metadataAppId = getMetadataAppId(selectedGame)

    const handleImageError = useCallback(() => {
        if (!imgSrc) return
        if (metadataAppId && imgSrc.includes('library_600x900_2x.jpg')) {
            setImgSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${metadataAppId}/library_600x900.jpg`)
        } else if (bannerSrc && imgSrc !== bannerSrc) {
            // Cover CDN exhausted — use banner as portrait fallback
            setImgSrc(bannerSrc)
        } else {
            setImgSrc(undefined)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [metadataAppId, imgSrc, bannerSrc])

    const handleBannerError = useCallback(() => {
        if (!metadataAppId || !bannerSrc) {
            setBannerSrc(undefined)
            return
        }
        if (bannerSrc.includes('library_hero.jpg')) {
            setBannerSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${metadataAppId}/header.jpg`)
        } else {
            setBannerSrc(undefined)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [metadataAppId, bannerSrc])

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
                        <GameDetailCoverCard
                            game={selectedGame}
                            imgSrc={imgSrc}
                            bannerSrc={bannerSrc}
                            onImageError={handleImageError}
                        />

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

                        <GameDetailTabs
                            game={selectedGame}
                            activeTab={activeTab}
                            setActiveTab={setActiveTab}
                            gameDetails={gameDetails}
                            detailsLoading={detailsLoading}
                            achievementsData={achievementsData}
                            achievementsLoading={achievementsLoading}
                            toggleAchievement={toggleAchievement}
                            isManualAchievements={isManualAchievements}
                            newsData={newsData}
                            newsLoading={newsLoading}
                            formattedPlaytime={formattedPlaytime}
                            formattedLastPlayed={formattedLastPlayed}
                        />
                    </motion.div>
                </MotionConfig>
            )}
        </AnimatePresence>
    )
}
