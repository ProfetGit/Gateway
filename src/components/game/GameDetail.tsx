import { motion, AnimatePresence, MotionConfig } from 'framer-motion'
import {
    X,
    Play,
    Star,
    Trash2,
    Clock,
    Calendar,
    Terminal,
    Download,
    Cpu,
    HardDrive,
    Gamepad2,
    Trophy,
    Newspaper,
    ExternalLink,
    Monitor,
    Activity,
    Zap,
    Maximize2,
    ChevronDown,
    Settings
} from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useState, useEffect, useRef, useMemo, useCallback } from 'react'
import { AchievementsTab } from './AchievementsTab'
import { PatchNotesTab } from './PatchNotesTab'
import type { FetchAchievementsResult, FetchNewsResult, FetchGameDetailsResult } from '../../types/game'

// ═══════════════════════════════════════════════════════════════════════════════
// PERFORMANCE: Pre-defined animation variants (avoid re-creating on each render)
// ═══════════════════════════════════════════════════════════════════════════════
const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
}

const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 30 }
}



const launchBoltVariants = {
    idle: { x: 0, scale: 1, backgroundColor: '#dc2626' },
    hover: { x: 6, scale: 1.05, backgroundColor: '#ffffff', boxShadow: '0 0 40px rgba(255,255,255,0.5)' },
    tap: { scale: 0.92 }
}

const launchIconVariants = {
    idle: { color: '#ffffff' },
    hover: { color: '#dc2626' }
}

const launchTextVariants = {
    idle: { x: 0, skewX: 0, opacity: 0.9 },
    hover: { x: 8, skewX: -8, opacity: 1, textShadow: '3px 3px 0px rgba(220,38,38,0.4)' }
}

const launchSubtextVariants = {
    idle: { x: 0, opacity: 0.6 },
    hover: { x: 8, opacity: 1 }
}

const installBoltVariants = {
    idle: { x: 0, scale: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.05)' },
    hover: { x: 6, scale: 1.05, borderColor: '#dc2626', backgroundColor: '#dc2626', boxShadow: '0 0 30px rgba(220,38,38,0.5)' },
    tap: { scale: 0.92 }
}

const installIconVariants = {
    idle: { color: 'rgba(255,255,255,0.7)' },
    hover: { color: '#ffffff' }
}

const installTextVariants = {
    idle: { x: 0, skewX: 0, opacity: 0.7 },
    hover: { x: 8, skewX: -8, opacity: 1, textShadow: '3px 3px 0px rgba(220,38,38,0.4)' }
}

const installSubtextVariants = {
    idle: { x: 0, opacity: 0.5 },
    hover: { x: 8, opacity: 1, color: 'rgba(220,38,38,0.8)' }
}

const springTransition = { type: "spring" as const, stiffness: 500, damping: 30 }
const fastTransition = { duration: 0.15, ease: "easeOut" as const }

type TabType = 'overview' | 'achievements' | 'patchnotes'

export function GameDetail() {
    const { selectedGame, isDetailOpen, closeDetail, toggleFavorite, deleteGame, updateGame } = useGameStore()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isInstalling, setIsInstalling] = useState(false)
    const [imgSrc, setImgSrc] = useState<string | undefined>(undefined)
    const [activeTab, setActiveTab] = useState<TabType>('overview')
    const [gamescopeExpanded, setGamescopeExpanded] = useState(false)

    // Achievements cache
    const [achievementsData, setAchievementsData] = useState<FetchAchievementsResult | null>(null)
    const [achievementsLoading, setAchievementsLoading] = useState(false)
    const fetchedAchievementsRef = useRef<string | null>(null)

    // News cache
    const [newsData, setNewsData] = useState<FetchNewsResult | null>(null)
    const [newsLoading, setNewsLoading] = useState(false)
    const fetchedNewsRef = useRef<string | null>(null)

    // Game details cache
    const [gameDetails, setGameDetails] = useState<FetchGameDetailsResult | null>(null)
    const [detailsLoading, setDetailsLoading] = useState(false)
    const fetchedDetailsRef = useRef<string | null>(null)

    // Banner Image State
    const [bannerSrc, setBannerSrc] = useState<string | undefined>(undefined)

    // Reset tab and cache when game changes
    useEffect(() => {
        setActiveTab('overview')
        setAchievementsData(null)
        setNewsData(null)
        setGameDetails(null)
        fetchedAchievementsRef.current = null
        fetchedNewsRef.current = null
        fetchedDetailsRef.current = null

        // Setup images
        if (selectedGame) {
            // Cover Art - prioritization: local -> remote
            const cover = selectedGame.localCoverPath
                ? `gateway://cover/${selectedGame.localCoverPath}`
                : selectedGame.coverUrl
            setImgSrc(cover)

            // Banner Search - prioritization: steam cdn -> heroic metadata -> undefined
            if (selectedGame.steamAppId) {
                setBannerSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${selectedGame.steamAppId}/library_hero.jpg`)
            } else if (selectedGame.heroImageUrl) {
                setBannerSrc(selectedGame.heroImageUrl)
            } else {
                setBannerSrc(undefined)
            }
        }
    }, [selectedGame?.id])

    // Data Fetching Effects
    useEffect(() => {
        if (!selectedGame?.steamAppId) return
        if (fetchedDetailsRef.current === selectedGame.steamAppId) return

        fetchedDetailsRef.current = selectedGame.steamAppId
        setDetailsLoading(true)

        window.api?.getGameDetails(selectedGame.steamAppId)
            .then(result => setGameDetails(result))
            .catch(error => {
                console.error('Failed to fetch game details:', error)
                setGameDetails({ success: false, details: null, error: 'Failed' })
            })
            .finally(() => setDetailsLoading(false))
    }, [selectedGame?.steamAppId])

    useEffect(() => {
        if (activeTab !== 'achievements' || !selectedGame?.steamAppId) return
        if (fetchedAchievementsRef.current === selectedGame.steamAppId) return

        fetchedAchievementsRef.current = selectedGame.steamAppId
        setAchievementsLoading(true)

        window.api?.getAchievements(selectedGame.steamAppId)
            .then(result => setAchievementsData(result))
            .catch(() => setAchievementsData({ success: false, achievements: [], totalAchievements: 0, unlockedCount: 0 }))
            .finally(() => setAchievementsLoading(false))
    }, [activeTab, selectedGame?.steamAppId])

    useEffect(() => {
        if (activeTab !== 'patchnotes' || !selectedGame?.steamAppId) return
        if (fetchedNewsRef.current === selectedGame.steamAppId) return

        fetchedNewsRef.current = selectedGame.steamAppId
        setNewsLoading(true)

        window.api?.getGameNews(selectedGame.steamAppId, 10)
            .then(result => setNewsData(result))
            .catch(() => setNewsData({ success: false, news: [], totalCount: 0 }))
            .finally(() => setNewsLoading(false))
    }, [activeTab, selectedGame?.steamAppId])


    // ═══════════════════════════════════════════════════════════════════════════════
    // MEMOIZED HANDLERS (prevent re-creation on each render)
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
            : 'Download now'
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

                        {/* ═══════════════════════════════════════════════════════════
                            LEFT PANEL: Cover Art & Quick Actions
                        ═══════════════════════════════════════════════════════════ */}
                        <div className="relative w-[280px] shrink-0 bg-void-deep border-r border-void-border/30 flex flex-col">
                            {/* Ambient bleed background */}
                            <div className="absolute inset-0 overflow-hidden">
                                {imgSrc && (
                                    <img
                                        src={imgSrc}
                                        className="ambient-bleed w-full h-full object-cover"
                                        alt=""
                                    />
                                )}
                                <div className="absolute inset-0 bg-void-deep/80" />
                            </div>

                            {/* Cover Art */}
                            <div className="relative p-4 z-10">
                                <motion.div
                                    className="relative aspect-[3/4] rounded-lg overflow-hidden border border-void-border/50 shadow-void-lift group"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.1 }}
                                >
                                    {/* Corner accents */}
                                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-crimson-500/60 z-20 pointer-events-none" />
                                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-crimson-500/60 z-20 pointer-events-none" />

                                    {imgSrc ? (
                                        <img
                                            src={imgSrc}
                                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                                            onError={handleImageError}
                                            alt={selectedGame.title}
                                        />
                                    ) : (
                                        <div className="w-full h-full bg-void-surface flex items-center justify-center">
                                            <span className="text-6xl font-display font-black text-white/5">
                                                {selectedGame.title.charAt(0)}
                                            </span>
                                        </div>
                                    )}

                                    {/* Scanline overlay */}
                                    <div className="absolute inset-0 bg-scanlines opacity-30 pointer-events-none" />

                                    {/* Gradient overlay */}
                                    <div className="absolute inset-0 bg-gradient-to-t from-void-pure/60 via-transparent to-transparent pointer-events-none" />

                                    {/* Installed indicator */}
                                    {selectedGame.isInstalled && (
                                        <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded">
                                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                                            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400">Installed</span>
                                        </div>
                                    )}
                                </motion.div>
                            </div>

                            {/* Quick Info */}
                            <div className="flex-1 px-4 pb-4 z-10 space-y-3 overflow-y-auto scrollbar-hide">
                                <div className="space-y-2">
                                    <InfoRow label="Platform" value={selectedGame.source?.toUpperCase() || 'LOCAL'} icon={<Monitor size={12} />} />
                                    <InfoRow label="Status" value={selectedGame.isInstalled ? 'Ready' : 'Not Installed'} />
                                    {selectedGame.sizeOnDisk && (
                                        <InfoRow label="Size" value={`${(selectedGame.sizeOnDisk / 1073741824).toFixed(1)} GB`} />
                                    )}
                                    {gameDetails?.details?.releaseDate && (
                                        <InfoRow label="Released" value={gameDetails.details.releaseDate} />
                                    )}
                                </div>

                                {/* Launch Options */}
                                {selectedGame.isInstalled && (
                                    <div className="pt-3 border-t border-void-border/20 space-y-2">
                                        <div className="flex items-center gap-1.5 mb-2">
                                            <Settings size={10} className="text-white/40" />
                                            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Launch Options</span>
                                        </div>

                                        {/* MangoHud Toggle */}
                                        <LaunchToggle
                                            label="MangoHud"
                                            description="Performance overlay"
                                            icon={<Activity size={12} />}
                                            enabled={selectedGame.mangoHudEnabled ?? false}
                                            onToggle={() => {
                                                const newValue = !selectedGame.mangoHudEnabled
                                                updateGame(selectedGame.id, { mangoHudEnabled: newValue })
                                                window.api?.updateGame(selectedGame.id, { mangoHudEnabled: newValue })
                                            }}
                                        />

                                        {/* GameMode Toggle */}
                                        <LaunchToggle
                                            label="GameMode"
                                            description="CPU governor optimization"
                                            icon={<Zap size={12} />}
                                            enabled={selectedGame.gamemodeEnabled ?? false}
                                            onToggle={() => {
                                                const newValue = !selectedGame.gamemodeEnabled
                                                updateGame(selectedGame.id, { gamemodeEnabled: newValue })
                                                window.api?.updateGame(selectedGame.id, { gamemodeEnabled: newValue })
                                            }}
                                        />

                                        {/* Gamescope Toggle with Expandable Options */}
                                        <div className="space-y-1">
                                            <div className="flex items-center gap-2">
                                                <LaunchToggle
                                                    label="Gamescope"
                                                    description="Nested compositor"
                                                    icon={<Maximize2 size={12} />}
                                                    enabled={selectedGame.gamescope?.enabled ?? false}
                                                    onToggle={() => {
                                                        const newValue = !selectedGame.gamescope?.enabled
                                                        const newSettings = { ...selectedGame.gamescope, enabled: newValue }
                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                    }}
                                                />
                                                {selectedGame.gamescope?.enabled && (
                                                    <button
                                                        onClick={() => setGamescopeExpanded(!gamescopeExpanded)}
                                                        className="p-1 rounded bg-void-surface/50 hover:bg-void-surface text-white/30 hover:text-white/60 transition-colors"
                                                    >
                                                        <motion.div
                                                            animate={{ rotate: gamescopeExpanded ? 180 : 0 }}
                                                            transition={{ duration: 0.2 }}
                                                        >
                                                            <ChevronDown size={12} />
                                                        </motion.div>
                                                    </button>
                                                )}
                                            </div>

                                            {/* Gamescope Expanded Settings */}
                                            <AnimatePresence>
                                                {gamescopeExpanded && selectedGame.gamescope?.enabled && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: 'auto', opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pl-4 pt-2 space-y-2 border-l border-void-border/20 ml-1">
                                                            {/* Resolution */}
                                                            <div className="grid grid-cols-2 gap-2">
                                                                <GamescopeInput
                                                                    label="Render W"
                                                                    value={selectedGame.gamescope.width}
                                                                    placeholder="1280"
                                                                    onChange={(v) => {
                                                                        const newSettings = { ...selectedGame.gamescope!, width: v }
                                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                    }}
                                                                />
                                                                <GamescopeInput
                                                                    label="Render H"
                                                                    value={selectedGame.gamescope.height}
                                                                    placeholder="720"
                                                                    onChange={(v) => {
                                                                        const newSettings = { ...selectedGame.gamescope!, height: v }
                                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                    }}
                                                                />
                                                                <GamescopeInput
                                                                    label="Output W"
                                                                    value={selectedGame.gamescope.outputWidth}
                                                                    placeholder="1920"
                                                                    onChange={(v) => {
                                                                        const newSettings = { ...selectedGame.gamescope!, outputWidth: v }
                                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                    }}
                                                                />
                                                                <GamescopeInput
                                                                    label="Output H"
                                                                    value={selectedGame.gamescope.outputHeight}
                                                                    placeholder="1080"
                                                                    onChange={(v) => {
                                                                        const newSettings = { ...selectedGame.gamescope!, outputHeight: v }
                                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                    }}
                                                                />
                                                            </div>

                                                            {/* Upscaling */}
                                                            <div className="space-y-1.5">
                                                                <span className="text-[9px] font-mono uppercase tracking-wider text-white/50">Upscaler</span>
                                                                <div className="flex gap-1.5 flex-wrap">
                                                                    {(['linear', 'nearest', 'fsr', 'nis'] as const).map((filter) => (
                                                                        <button
                                                                            key={filter}
                                                                            onClick={() => {
                                                                                const newSettings = { ...selectedGame.gamescope!, filter }
                                                                                updateGame(selectedGame.id, { gamescope: newSettings })
                                                                                window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                            }}
                                                                            className={`px-2.5 py-1.5 text-[10px] font-mono uppercase rounded transition-all ${selectedGame.gamescope?.filter === filter
                                                                                ? 'bg-crimson-500/30 text-crimson-400 border border-crimson-500/60'
                                                                                : 'bg-void-surface/50 text-white/60 border border-void-border/40 hover:text-white/80 hover:border-void-border/60'
                                                                                }`}
                                                                        >
                                                                            {filter.toUpperCase()}
                                                                        </button>
                                                                    ))}
                                                                </div>
                                                            </div>

                                                            {/* FSR Sharpness */}
                                                            {(selectedGame.gamescope?.filter === 'fsr' || selectedGame.gamescope?.filter === 'nis') && (
                                                                <GamescopeInput
                                                                    label={`${selectedGame.gamescope.filter.toUpperCase()} Sharpness`}
                                                                    value={selectedGame.gamescope.filter === 'fsr' ? selectedGame.gamescope.fsrSharpness : selectedGame.gamescope.nisSharpness}
                                                                    placeholder="2"
                                                                    onChange={(v) => {
                                                                        const key = selectedGame.gamescope?.filter === 'fsr' ? 'fsrSharpness' : 'nisSharpness'
                                                                        const newSettings = { ...selectedGame.gamescope!, [key]: v }
                                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                    }}
                                                                />
                                                            )}

                                                            {/* FPS Limit */}
                                                            <GamescopeInput
                                                                label="FPS Limit"
                                                                value={selectedGame.gamescope.fpsLimit}
                                                                placeholder="60"
                                                                onChange={(v) => {
                                                                    const newSettings = { ...selectedGame.gamescope!, fpsLimit: v }
                                                                    updateGame(selectedGame.id, { gamescope: newSettings })
                                                                    window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                }}
                                                            />

                                                            {/* Boolean Options */}
                                                            <div className="grid grid-cols-2 gap-1 pt-1">
                                                                <GamescopeMiniToggle
                                                                    label="Fullscreen"
                                                                    enabled={selectedGame.gamescope.fullscreen ?? false}
                                                                    onToggle={() => {
                                                                        const newSettings = { ...selectedGame.gamescope!, fullscreen: !selectedGame.gamescope?.fullscreen }
                                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                    }}
                                                                />
                                                                <GamescopeMiniToggle
                                                                    label="Borderless"
                                                                    enabled={selectedGame.gamescope.borderless ?? false}
                                                                    onToggle={() => {
                                                                        const newSettings = { ...selectedGame.gamescope!, borderless: !selectedGame.gamescope?.borderless }
                                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                    }}
                                                                />
                                                                <GamescopeMiniToggle
                                                                    label="VRR/Adaptive"
                                                                    enabled={selectedGame.gamescope.adaptiveSync ?? false}
                                                                    onToggle={() => {
                                                                        const newSettings = { ...selectedGame.gamescope!, adaptiveSync: !selectedGame.gamescope?.adaptiveSync }
                                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                    }}
                                                                />
                                                                <GamescopeMiniToggle
                                                                    label="HDR"
                                                                    enabled={selectedGame.gamescope.hdr ?? false}
                                                                    onToggle={() => {
                                                                        const newSettings = { ...selectedGame.gamescope!, hdr: !selectedGame.gamescope?.hdr }
                                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                                    }}
                                                                />
                                                            </div>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* Bottom Actions */}
                            <div className="p-4 border-t border-void-border/30 z-10 flex items-center gap-2">
                                <button
                                    onClick={() => toggleFavorite(selectedGame.id)}
                                    className={`p-2 rounded-lg transition-all duration-200 ${selectedGame.isFavorite
                                        ? 'bg-crimson-500/20 text-crimson-500'
                                        : 'bg-void-surface/50 text-white/30 hover:text-white/60 hover:bg-void-surface'
                                        }`}
                                >
                                    <Star size={16} className={selectedGame.isFavorite ? 'fill-crimson-500' : ''} />
                                </button>

                                {selectedGame.steamAppId && (
                                    <button
                                        onClick={() => window.api?.openSteamStore(selectedGame.steamAppId!)}
                                        className="p-2 rounded-lg bg-void-surface/50 text-white/30 hover:text-white/60 hover:bg-void-surface transition-all duration-200"
                                    >
                                        <ExternalLink size={16} />
                                    </button>
                                )}

                                {selectedGame.isInstalled && (
                                    <button
                                        onClick={handleDelete}
                                        className={`p-2 rounded-lg transition-all duration-200 ml-auto ${isDeleting
                                            ? 'bg-red-500/20 text-red-500'
                                            : 'bg-void-surface/50 text-white/30 hover:text-red-500 hover:bg-red-500/10'
                                            }`}
                                    >
                                        <Trash2 size={16} />
                                    </button>
                                )}
                            </div>
                        </div>

                        {/* ═══════════════════════════════════════════════════════════
                            RIGHT PANEL: Content
                        ═══════════════════════════════════════════════════════════ */}
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
                            <div className="relative h-[200px] shrink-0 overflow-hidden">
                                {bannerSrc ? (
                                    <motion.div
                                        className="absolute inset-0"
                                        initial={{ opacity: 0, scale: 1.05 }}
                                        animate={{ opacity: 1, scale: 1 }}
                                        transition={{ duration: 0.8 }}
                                    >
                                        <img
                                            src={bannerSrc}
                                            className="w-full h-full object-cover"
                                            alt=""
                                            onError={handleBannerError}
                                        />
                                        {/* Gradients */}
                                        <div className="absolute inset-0 bg-gradient-to-t from-void-pure via-void-pure/40 to-transparent" />
                                        <div className="absolute inset-0 bg-gradient-to-r from-void-pure/60 via-transparent to-void-pure/30" />
                                        {/* Scanlines */}
                                        <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none" />
                                    </motion.div>
                                ) : (
                                    <div className="absolute inset-0 bg-gradient-to-br from-crimson-950/30 via-void-deep to-void-pure" />
                                )}

                                {/* Title & Launch */}
                                <div className="absolute inset-0 flex items-end p-6">
                                    <div className="flex-1 max-w-3xl">
                                        {/* Developer tag */}
                                        {gameDetails?.details?.developers?.[0] && (
                                            <motion.div
                                                className="flex items-center gap-2 mb-2"
                                                initial={{ opacity: 0, x: -20 }}
                                                animate={{ opacity: 1, x: 0 }}
                                                transition={{ delay: 0.2 }}
                                            >
                                                <Terminal size={10} className="text-crimson-500" />
                                                <span className="text-[10px] font-mono uppercase tracking-widest text-white/50">
                                                    {gameDetails.details.developers[0]}
                                                </span>
                                            </motion.div>
                                        )}

                                        <motion.h1
                                            className="text-4xl font-display font-black text-white leading-none tracking-tight drop-shadow-lg"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.1 }}
                                        >
                                            {selectedGame.title}
                                        </motion.h1>
                                    </div>

                                    {/* Primary Action — Floating Bolt Style (inspired by HomeView hero) */}
                                    <motion.div
                                        initial={{ opacity: 0, x: 20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.25, type: "spring", stiffness: 300, damping: 25 }}
                                    >
                                        {selectedGame.isInstalled ? (
                                            <motion.button
                                                onClick={handlePlay}
                                                className="group relative flex items-center gap-4 bg-transparent pr-4"
                                                initial="idle"
                                                whileHover="hover"
                                                whileTap="tap"
                                            >
                                                {/* The Bolt (Icon) */}
                                                <motion.div
                                                    className="relative flex items-center justify-center w-12 h-12 bg-crimson-600 text-white rounded-md z-10 will-change-transform"
                                                    style={{ boxShadow: '0 0 25px rgba(220, 38, 38, 0.4)' }}
                                                    variants={launchBoltVariants}
                                                    transition={springTransition}
                                                >
                                                    <motion.div variants={launchIconVariants}>
                                                        <Play size={22} className="fill-current ml-0.5" />
                                                    </motion.div>
                                                </motion.div>

                                                {/* The Impact (Text) */}
                                                <div className="flex flex-col items-start">
                                                    <motion.span
                                                        className="uppercase tracking-tighter text-2xl font-display font-black italic leading-none text-white will-change-transform"
                                                        variants={launchTextVariants}
                                                        transition={springTransition}
                                                    >
                                                        Launch
                                                    </motion.span>
                                                    <motion.div
                                                        className="flex items-center gap-1.5 text-[9px] font-mono tracking-[0.2em] text-crimson-500 uppercase font-bold mt-0.5"
                                                        variants={launchSubtextVariants}
                                                        transition={fastTransition}
                                                    >
                                                        <span className="w-1.5 h-1.5 bg-crimson-500 rounded-full animate-pulse" />
                                                        Ready to play
                                                    </motion.div>
                                                </div>
                                            </motion.button>
                                        ) : (
                                            <motion.button
                                                onClick={handleInstall}
                                                disabled={isInstalling}
                                                className="group relative flex items-center gap-4 bg-transparent pr-4"
                                                initial="idle"
                                                whileHover="hover"
                                                whileTap="tap"
                                            >
                                                {/* The Bolt (Icon) — Ghost style for install */}
                                                <motion.div
                                                    className="relative flex items-center justify-center w-12 h-12 border-2 border-white/30 text-white rounded-md z-10 backdrop-blur-sm will-change-transform"
                                                    style={{ backgroundColor: 'rgba(255,255,255,0.05)' }}
                                                    variants={installBoltVariants}
                                                    transition={springTransition}
                                                >
                                                    {isInstalling ? (
                                                        <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                                    ) : (
                                                        <motion.div variants={installIconVariants}>
                                                            <Download size={20} />
                                                        </motion.div>
                                                    )}
                                                </motion.div>

                                                {/* The Impact (Text) */}
                                                <div className="flex flex-col items-start">
                                                    <motion.span
                                                        className="uppercase tracking-tighter text-2xl font-display font-black italic leading-none text-white will-change-transform"
                                                        variants={installTextVariants}
                                                        transition={springTransition}
                                                    >
                                                        {isInstalling ? 'Installing' : 'Install'}
                                                    </motion.span>
                                                    <motion.div
                                                        className="flex items-center gap-1.5 text-[9px] font-mono tracking-[0.2em] text-white/40 uppercase font-bold mt-0.5"
                                                        variants={installSubtextVariants}
                                                        transition={fastTransition}
                                                    >
                                                        {isInstalling && <span className="w-1.5 h-1.5 bg-white rounded-full animate-ping" />}
                                                        {formattedSize}
                                                    </motion.div>
                                                </div>
                                            </motion.button>
                                        )}
                                    </motion.div>
                                </div>
                            </div>

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
                                            <span className="text-xs font-display font-bold uppercase tracking-wider">{tab}</span>

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

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 scrollbar-hide">
                                <AnimatePresence mode="wait">
                                    {activeTab === 'overview' && (
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
                                                        className="text-sm text-white/70 leading-relaxed"
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
                                                <EmptyState icon={<Trophy size={32} />} message="Achievements not available for this game" />
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
                                                <EmptyState icon={<Newspaper size={32} />} message="News feed not available for this game" />
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

// ═══════════════════════════════════════════════════════════════════════════════
// SUB-COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-void-border/20">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                {icon}
                {label}
            </span>
            <span className="text-xs font-mono text-white/60">{value}</span>
        </div>
    )
}

function StatCard({ icon, label, value, highlight }: { icon: React.ReactNode; label: string; value: string; highlight?: 'emerald' | 'amber' }) {
    return (
        <div className="p-4 bg-void-surface/50 border border-void-border/30 rounded-lg relative overflow-hidden group hover:border-void-border/50 transition-colors">
            {highlight && (
                <div className={`absolute top-0 right-0 w-12 h-12 blur-2xl opacity-20 ${highlight === 'emerald' ? 'bg-emerald-500' : 'bg-amber-500'}`} />
            )}
            <div className="flex items-center gap-2 mb-2">
                {icon}
                <span className="text-[10px] font-mono uppercase tracking-widest text-white/40">{label}</span>
            </div>
            <div className={`text-xl font-display font-bold ${highlight === 'emerald' ? 'text-emerald-500' : highlight === 'amber' ? 'text-amber-500' : 'text-white'}`}>
                {value}
            </div>
        </div>
    )
}

function RequirementsCard({ title, icon, color, html }: { title: string; icon: React.ReactNode; color: 'crimson' | 'emerald'; html: string }) {
    return (
        <div className="p-4 bg-void-surface/50 border border-void-border/30 rounded-lg">
            <div className={`flex items-center gap-2 mb-3 ${color === 'crimson' ? 'text-crimson-500/80' : 'text-emerald-500/80'}`}>
                {icon}
                <span className="text-xs font-mono uppercase tracking-wider">{title}</span>
            </div>
            <div
                className="text-[11px] text-white/50 leading-relaxed space-y-1 font-mono [&_strong]:text-white/70 [&_strong]:block [&_strong]:mt-2 [&_strong]:mb-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    )
}

function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <div className="mb-4 opacity-30">{icon}</div>
            <span className="text-sm font-mono uppercase tracking-widest">{message}</span>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════════════════════════
// LAUNCH OPTIONS COMPONENTS
// ═══════════════════════════════════════════════════════════════════════════════

function LaunchToggle({
    label,
    description,
    icon,
    enabled,
    onToggle
}: {
    label: string
    description: string
    icon: React.ReactNode
    enabled: boolean
    onToggle: () => void
}) {
    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between py-2 group hover:bg-white/[0.02] rounded-lg transition-colors -mx-1 px-1"
        >
            <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md transition-colors ${enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40 group-hover:text-white/60'}`}>
                    {icon}
                </div>
                <div className="flex flex-col items-start">
                    <span className={`text-[11px] font-mono uppercase tracking-wider transition-colors ${enabled ? 'text-white/90' : 'text-white/70 group-hover:text-white/90'}`}>
                        {label}
                    </span>
                    <span className="text-[9px] font-mono text-white/40">{description}</span>
                </div>
            </div>
            <div className={`relative w-9 h-5 rounded-full transition-all duration-300 ${enabled
                ? 'bg-emerald-500/30 border-emerald-500/60'
                : 'bg-void-surface/80 border-void-border/50'
                } border`}>
                <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow-sm ${enabled ? 'bg-emerald-500 translate-x-4' : 'bg-white/30 translate-x-0.5'
                        }`}
                />
            </div>
        </button>
    )
}

function GamescopeInput({
    label,
    value,
    placeholder,
    onChange
}: {
    label: string
    value: number | undefined
    placeholder: string
    onChange: (value: number | undefined) => void
}) {
    return (
        <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase tracking-wider text-white/50">{label}</label>
            <input
                type="number"
                value={value ?? ''}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-2 py-1.5 text-[11px] font-mono bg-void-surface/80 border border-void-border/40 rounded text-white/90 placeholder:text-white/30 focus:outline-none focus:border-crimson-500/50 focus:bg-void-surface transition-colors"
            />
        </div>
    )
}

function GamescopeMiniToggle({
    label,
    enabled,
    onToggle
}: {
    label: string
    enabled: boolean
    onToggle: () => void
}) {
    return (
        <button
            onClick={onToggle}
            className={`px-2.5 py-1.5 text-[9px] font-mono uppercase rounded transition-all flex items-center gap-1.5 ${enabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                : 'bg-void-surface/50 text-white/50 border border-void-border/30 hover:text-white/70 hover:border-void-border/50'
                }`}
        >
            <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-white/30'}`} />
            {label}
        </button>
    )
}
