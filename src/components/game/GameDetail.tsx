import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    Play,
    Heart,
    Trash2,
    Clock,
    Calendar,
    ExternalLink,
    Terminal,
    Share2,
    Monitor,
    Download,
    CloudDownload
} from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useState, useEffect, useRef } from 'react'
import { AchievementsTab } from './AchievementsTab'
import { PatchNotesTab } from './PatchNotesTab'
import type { FetchAchievementsResult, FetchNewsResult, FetchGameDetailsResult } from '../../types/game'

type TabType = 'overview' | 'achievements' | 'patchnotes'

export function GameDetail() {
    const { selectedGame, isDetailOpen, closeDetail, toggleFavorite, deleteGame } = useGameStore()
    const [isDeleting, setIsDeleting] = useState(false)
    const [isInstalling, setIsInstalling] = useState(false)
    const [imgSrc, setImgSrc] = useState<string | undefined>(undefined)
    const [imageError, setImageError] = useState(false)
    const [activeTab, setActiveTab] = useState<TabType>('overview')

    // Achievements cache - only fetch once per game
    const [achievementsData, setAchievementsData] = useState<FetchAchievementsResult | null>(null)
    const [achievementsLoading, setAchievementsLoading] = useState(false)
    const fetchedAchievementsRef = useRef<string | null>(null)

    // News cache - only fetch once per game
    const [newsData, setNewsData] = useState<FetchNewsResult | null>(null)
    const [newsLoading, setNewsLoading] = useState(false)
    const fetchedNewsRef = useRef<string | null>(null)

    // Game details cache - fetch on mount for Steam games
    const [gameDetails, setGameDetails] = useState<FetchGameDetailsResult | null>(null)
    const [detailsLoading, setDetailsLoading] = useState(false)
    const fetchedDetailsRef = useRef<string | null>(null)

    // Reset tab and cache when game changes
    useEffect(() => {
        setActiveTab('overview')
        setAchievementsData(null)
        setNewsData(null)
        setGameDetails(null)
        fetchedAchievementsRef.current = null
        fetchedNewsRef.current = null
        fetchedDetailsRef.current = null
    }, [selectedGame?.id])

    // Fetch game details immediately for Steam games (for Overview tab)
    useEffect(() => {
        if (!selectedGame?.steamAppId) return
        if (fetchedDetailsRef.current === selectedGame.steamAppId) return

        fetchedDetailsRef.current = selectedGame.steamAppId
        setDetailsLoading(true)

        window.api?.getGameDetails(selectedGame.steamAppId)
            .then(result => {
                setGameDetails(result)
            })
            .catch(error => {
                console.error('Failed to fetch game details:', error)
                setGameDetails({
                    success: false,
                    details: null,
                    error: 'Failed to fetch details',
                    errorCode: 'NETWORK_ERROR',
                })
            })
            .finally(() => {
                setDetailsLoading(false)
            })
    }, [selectedGame?.steamAppId])

    // Fetch achievements when switching to achievements tab (only once per game)
    useEffect(() => {
        if (activeTab !== 'achievements') return
        if (!selectedGame?.steamAppId) return
        if (fetchedAchievementsRef.current === selectedGame.steamAppId) return

        fetchedAchievementsRef.current = selectedGame.steamAppId
        setAchievementsLoading(true)

        window.api?.getAchievements(selectedGame.steamAppId)
            .then(result => {
                setAchievementsData(result)
            })
            .catch(error => {
                console.error('Failed to fetch achievements:', error)
                setAchievementsData({
                    success: false,
                    achievements: [],
                    totalAchievements: 0,
                    unlockedCount: 0,
                    error: 'Failed to fetch achievements',
                    errorCode: 'NETWORK_ERROR',
                })
            })
            .finally(() => {
                setAchievementsLoading(false)
            })
    }, [activeTab, selectedGame?.steamAppId])

    // Fetch news when switching to patchnotes tab (only once per game)
    useEffect(() => {
        if (activeTab !== 'patchnotes') return
        if (!selectedGame?.steamAppId) return
        if (fetchedNewsRef.current === selectedGame.steamAppId) return

        fetchedNewsRef.current = selectedGame.steamAppId
        setNewsLoading(true)

        window.api?.getGameNews(selectedGame.steamAppId, 10)
            .then(result => {
                setNewsData(result)
            })
            .catch(error => {
                console.error('Failed to fetch news:', error)
                setNewsData({
                    success: false,
                    news: [],
                    totalCount: 0,
                    error: 'Failed to fetch news',
                    errorCode: 'NETWORK_ERROR',
                })
            })
            .finally(() => {
                setNewsLoading(false)
            })
    }, [activeTab, selectedGame?.steamAppId])

    const getCoverSrc = (game: any) => {
        if (game?.localCoverPath) return `gateway://cover/${game.localCoverPath}`
        return game?.coverUrl
    }

    useEffect(() => {
        if (selectedGame) {
            setImgSrc(getCoverSrc(selectedGame))
            setImageError(false)
        }
    }, [selectedGame])

    if (!selectedGame) return null

    const handleImageError = () => {
        const currentSrc = imgSrc || ''

        // If local cover failed, fallback to CDN
        if (currentSrc.startsWith('gateway://') && selectedGame.coverUrl) {
            setImgSrc(selectedGame.coverUrl)
            return
        }

        if (!selectedGame.steamAppId) {
            setImageError(true)
            return
        }

        if (currentSrc.includes('library_600x900_2x.jpg')) {
            setImgSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${selectedGame.steamAppId}/library_600x900.jpg`)
        } else if (currentSrc.includes('library_600x900.jpg')) {
            setImgSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${selectedGame.steamAppId}/header.jpg`)
        } else {
            setImageError(true)
        }
    }

    const handlePlay = async () => {
        await window.api?.launchGame(selectedGame)
    }

    const handleInstall = async () => {
        if (!selectedGame.steamAppId) return
        setIsInstalling(true)
        try {
            await window.api?.installSteamGame(selectedGame.steamAppId)
        } catch (error) {
            console.error('Failed to start installation:', error)
        } finally {
            // Keep the installing state for visual feedback
            // The actual install happens in Steam client
            setTimeout(() => setIsInstalling(false), 2000)
        }
    }

    const handleDelete = async () => {
        if (isDeleting) {
            await window.api?.deleteGame(selectedGame.id)
            deleteGame(selectedGame.id)
            closeDetail()
        } else {
            setIsDeleting(true)
            setTimeout(() => setIsDeleting(false), 3000)
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'NEVER'
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        }).toUpperCase()
    }

    const formatPlaytime = (minutes?: number) => {
        if (!minutes) return '0h 00m'
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return `${hours}h ${mins}m`
    }

    const hasCover = imgSrc && !imageError

    return (
        <AnimatePresence>
            {isDetailOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-void-pure/95 backdrop-blur-xl z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeDetail}
                    />

                    {/* Portal Container */}
                    <motion.div
                        className="fixed inset-4 md:inset-10 z-50 flex overflow-hidden border border-white/10 bg-void-deep shadow-2xl"
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* Decorative Corner Markers */}
                        <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-crimson-500 z-50" />
                        <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-crimson-500 z-50" />
                        <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-crimson-500 z-50" />
                        <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-crimson-500 z-50" />

                        {/* LEFT: Visor / Cover Art Area */}
                        <div className="relative w-[40%] h-full shrink-0 overflow-hidden bg-void-pure border-r border-white/5">
                            {/* Background Texture */}
                            <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay" />

                            {/* Image */}
                            {hasCover ? (
                                <motion.div
                                    className="absolute inset-0"
                                    initial={{ scale: 1.1, opacity: 0 }}
                                    animate={{ scale: 1, opacity: 1 }}
                                    transition={{ duration: 0.8 }}
                                >
                                    <img
                                        src={imgSrc}
                                        alt={selectedGame.title}
                                        className="w-full h-full object-cover filter brightness-75 contrast-125 transition-all duration-700"
                                        onError={handleImageError}
                                    />
                                    {/* Scanline Overlay */}
                                    <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#000_3px)] opacity-30" />
                                    <div className="absolute inset-0 bg-gradient-to-t from-void-deep via-transparent to-transparent" />
                                </motion.div>
                            ) : (
                                <div className="absolute inset-0 flex items-center justify-center bg-void-surface">
                                    <Terminal className="w-32 h-32 text-white/5" />
                                </div>
                            )}

                            {/* Data Overlay on Image */}
                            <div className="absolute bottom-0 left-0 right-0 p-8 space-y-4">
                                <motion.h1
                                    className="text-5xl md:text-7xl font-display font-black text-transparent bg-clip-text bg-gradient-to-b from-white to-white/40 italic uppercase tracking-tighter drop-shadow-lg transform -skew-x-6"
                                    initial={{ x: -50, opacity: 0 }}
                                    animate={{ x: 0, opacity: 1 }}
                                    transition={{ delay: 0.2 }}
                                >
                                    {selectedGame.title}
                                </motion.h1>
                                <motion.div
                                    className="flex items-center gap-4 text-xs font-mono text-crimson-500 tracking-[0.2em] font-bold"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.4 }}
                                >
                                    <span className="bg-crimson-500/10 px-2 py-1 border border-crimson-500/20">ID: {selectedGame.id.slice(0, 8)}</span>
                                    {selectedGame.source === 'steam' && <span className="flex items-center gap-2"><Monitor className="w-3 h-3" /> STEAM</span>}
                                </motion.div>
                            </div>
                        </div>

                        {/* RIGHT: Data / Controls */}
                        <div className="relative flex-1 flex flex-col bg-void-deep">
                            {/* Header Bar */}
                            <div className="h-20 border-b border-white/5 flex items-center justify-between px-10 shrink-0">
                                <div className="flex items-center gap-6">
                                    {/* Tabs */}
                                    <div className="flex items-center gap-8 relative">
                                        <button
                                            onClick={() => setActiveTab('overview')}
                                            className={`relative text-sm font-display font-bold italic uppercase py-6 transition-colors ${activeTab === 'overview' ? 'text-white' : 'text-white/40 hover:text-white'
                                                }`}
                                        >
                                            Overview
                                            {activeTab === 'overview' && (
                                                <motion.div
                                                    layoutId="tab-indicator"
                                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson-500"
                                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                                />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('achievements')}
                                            className={`relative text-sm font-display font-bold italic uppercase py-6 transition-colors ${activeTab === 'achievements' ? 'text-white' : 'text-white/40 hover:text-white'
                                                }`}
                                        >
                                            Achievements
                                            {activeTab === 'achievements' && (
                                                <motion.div
                                                    layoutId="tab-indicator"
                                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson-500"
                                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                                />
                                            )}
                                        </button>
                                        <button
                                            onClick={() => setActiveTab('patchnotes')}
                                            className={`relative text-sm font-display font-bold italic uppercase py-6 transition-colors ${activeTab === 'patchnotes' ? 'text-white' : 'text-white/40 hover:text-white'
                                                }`}
                                        >
                                            Patch Notes
                                            {activeTab === 'patchnotes' && (
                                                <motion.div
                                                    layoutId="tab-indicator"
                                                    className="absolute bottom-0 left-0 right-0 h-0.5 bg-crimson-500"
                                                    transition={{ type: 'spring', stiffness: 500, damping: 35 }}
                                                />
                                            )}
                                        </button>
                                    </div>
                                </div>
                                <button
                                    onClick={closeDetail}
                                    className="p-2 text-white/40 hover:text-crimson-500 transition-colors hover:rotate-90 duration-300"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>

                            {/* Scrollable Content */}
                            <div className="flex-1 overflow-y-auto p-10 scrollbar-hide">
                                {activeTab === 'overview' && (
                                    <motion.div
                                        key="overview"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        {/* Status Header */}
                                        <div className="flex items-start justify-between mb-12">
                                            <div className="flex flex-col gap-2">
                                                <span className="text-xs font-mono text-white/30 tracking-[0.2em] uppercase">STATUS</span>
                                                <div className="flex items-center gap-3">
                                                    <div className={`w-3 h-3 rounded-full ${selectedGame.isInstalled ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-amber-500/50 animate-pulse'}`} />
                                                    <span className={`text-2xl font-display font-bold italic uppercase ${selectedGame.isInstalled ? 'text-white' : 'text-amber-400/80'}`}>
                                                        {selectedGame.isInstalled ? 'INSTALLED' : 'NOT INSTALLED'}
                                                    </span>
                                                </div>
                                                {!selectedGame.isInstalled && selectedGame.steamAppId && (
                                                    <span className="text-xs font-mono text-white/30 mt-1">
                                                        Available in your Steam library
                                                    </span>
                                                )}
                                            </div>

                                            {/* Quick Actions */}
                                            <div className="flex items-center gap-2">
                                                <button
                                                    onClick={() => toggleFavorite(selectedGame.id)}
                                                    className={`p-3 border border-white/10 hover:border-crimson-500/50 hover:bg-crimson-500/10 transition-all group ${selectedGame.isFavorite ? 'border-crimson-500 bg-crimson-500/10' : ''}`}
                                                >
                                                    <Heart className={`w-5 h-5 ${selectedGame.isFavorite ? 'text-crimson-500 fill-crimson-500' : 'text-white/40 group-hover:text-crimson-500'}`} />
                                                </button>
                                                <button className="p-3 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all text-white/40 hover:text-white">
                                                    <Share2 className="w-5 h-5" />
                                                </button>
                                                {selectedGame.steamAppId && (
                                                    <a
                                                        href={`https://store.steampowered.com/app/${selectedGame.steamAppId}`}
                                                        target="_blank"
                                                        rel="noreferrer"
                                                        className="p-3 border border-white/10 hover:border-white/30 hover:bg-white/5 transition-all text-white/40 hover:text-white"
                                                    >
                                                        <ExternalLink className="w-5 h-5" />
                                                    </a>
                                                )}
                                            </div>
                                        </div>

                                        {/* Hero Stats Row - Different treatment for installed vs not */}
                                        {selectedGame.isInstalled ? (
                                            <div className="flex items-stretch gap-6 mb-8">
                                                {/* Primary Stat - Playtime */}
                                                <div className="flex-1 bg-gradient-to-br from-crimson-500/10 to-transparent border border-crimson-500/20 p-6 relative overflow-hidden group hover:border-crimson-500/40 transition-all">
                                                    <div className="absolute top-0 right-0 w-32 h-32 bg-crimson-500/5 rounded-full blur-2xl translate-x-1/2 -translate-y-1/2" />
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Clock className="w-4 h-4 text-crimson-500" />
                                                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">Playtime</span>
                                                    </div>
                                                    <span className="text-4xl font-display font-black italic text-white tracking-tight">
                                                        {formatPlaytime(selectedGame.playtime)}
                                                    </span>
                                                </div>

                                                {/* Secondary Stat - Last Played */}
                                                <div className="flex-1 bg-void-surface border border-white/5 p-6 relative overflow-hidden group hover:border-white/20 transition-all">
                                                    <div className="flex items-center gap-2 mb-2">
                                                        <Calendar className="w-4 h-4 text-white/40" />
                                                        <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/40">Last Session</span>
                                                    </div>
                                                    <span className="text-3xl font-display font-bold italic text-white/90 tracking-tight">
                                                        {formatDate(selectedGame.lastPlayed)}
                                                    </span>
                                                </div>

                                                {/* Metacritic (if available) */}
                                                {gameDetails?.details?.metacriticScore && (
                                                    <div className={`w-28 shrink-0 flex flex-col items-center justify-center border p-4 ${gameDetails.details.metacriticScore >= 75
                                                        ? 'bg-emerald-500/10 border-emerald-500/30'
                                                        : gameDetails.details.metacriticScore >= 50
                                                            ? 'bg-amber-500/10 border-amber-500/30'
                                                            : 'bg-red-500/10 border-red-500/30'
                                                        }`}>
                                                        <span className="text-[9px] font-mono uppercase tracking-[0.15em] text-white/40 mb-1">Metacritic</span>
                                                        <span className={`text-4xl font-display font-black italic ${gameDetails.details.metacriticScore >= 75
                                                            ? 'text-emerald-400'
                                                            : gameDetails.details.metacriticScore >= 50
                                                                ? 'text-amber-400'
                                                                : 'text-red-400'
                                                            }`}>
                                                            {gameDetails.details.metacriticScore}
                                                        </span>
                                                    </div>
                                                )}
                                            </div>
                                        ) : (
                                            /* Not Installed - Show Install CTA prominent area */
                                            <div className="mb-10">
                                                <motion.div
                                                    className="relative p-8 border border-amber-500/20 bg-gradient-to-br from-amber-500/5 via-transparent to-transparent overflow-hidden"
                                                    initial={{ opacity: 0, y: 10 }}
                                                    animate={{ opacity: 1, y: 0 }}
                                                    transition={{ delay: 0.1 }}
                                                >
                                                    {/* Decorative background pattern */}
                                                    <div className="absolute inset-0 opacity-5">
                                                        <div className="absolute inset-0 bg-[repeating-linear-gradient(45deg,transparent,transparent_10px,currentColor_10px,currentColor_11px)] text-amber-500" />
                                                    </div>

                                                    <div className="relative flex items-center justify-between gap-6">
                                                        <div className="flex items-center gap-6">
                                                            <div className="w-16 h-16 flex items-center justify-center border border-amber-500/30 bg-amber-500/10">
                                                                <CloudDownload className="w-8 h-8 text-amber-400" />
                                                            </div>
                                                            <div>
                                                                <h3 className="text-lg font-display font-bold italic text-white mb-1">
                                                                    Ready to Download
                                                                </h3>
                                                                <p className="text-sm text-white/50 max-w-md">
                                                                    {selectedGame.steamAppId
                                                                        ? 'This game is in your Steam library. Click Install to download it through Steam.'
                                                                        : 'Set an executable path to launch this game, or install it manually.'
                                                                    }
                                                                </p>
                                                            </div>
                                                        </div>

                                                        {selectedGame.steamAppId && (
                                                            <motion.button
                                                                onClick={handleInstall}
                                                                disabled={isInstalling}
                                                                className="
                                                                    flex items-center gap-3 px-8 py-4
                                                                    bg-amber-500 hover:bg-amber-400 disabled:bg-amber-500/50
                                                                    text-black font-display font-bold italic uppercase tracking-tight text-lg
                                                                    transition-all duration-300
                                                                "
                                                                whileHover={{ scale: isInstalling ? 1 : 1.02 }}
                                                                whileTap={{ scale: isInstalling ? 1 : 0.98 }}
                                                            >
                                                                {isInstalling ? (
                                                                    <>
                                                                        <motion.div
                                                                            animate={{ rotate: 360 }}
                                                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                                        >
                                                                            <Download className="w-5 h-5" />
                                                                        </motion.div>
                                                                        <span>Opening Steam...</span>
                                                                    </>
                                                                ) : (
                                                                    <>
                                                                        <Download className="w-5 h-5" />
                                                                        <span>Install</span>
                                                                    </>
                                                                )}
                                                            </motion.button>
                                                        )}
                                                    </div>
                                                </motion.div>

                                                {/* Minimal stats row for uninstalled - show what's known */}
                                                <div className="flex items-stretch gap-4 mt-6">
                                                    {selectedGame.playtime && selectedGame.playtime > 0 ? (
                                                        <div className="flex-1 bg-void-surface/50 border border-white/5 p-4 opacity-60">
                                                            <div className="flex items-center gap-2 mb-1">
                                                                <Clock className="w-3 h-3 text-white/30" />
                                                                <span className="text-[9px] font-mono uppercase tracking-[0.2em] text-white/30">Previous Playtime</span>
                                                            </div>
                                                            <span className="text-xl font-display font-bold italic text-white/50 tracking-tight">
                                                                {formatPlaytime(selectedGame.playtime)}
                                                            </span>
                                                        </div>
                                                    ) : (
                                                        <div className="flex-1 bg-void-surface/30 border border-dashed border-white/10 p-4 flex items-center justify-center">
                                                            <span className="text-xs font-mono text-white/20 uppercase tracking-wider">
                                                                Playtime tracked after install
                                                            </span>
                                                        </div>
                                                    )}

                                                    {/* Metacritic (if available) */}
                                                    {gameDetails?.details?.metacriticScore && (
                                                        <div className={`w-24 shrink-0 flex flex-col items-center justify-center border p-3 ${gameDetails.details.metacriticScore >= 75
                                                            ? 'bg-emerald-500/10 border-emerald-500/30'
                                                            : gameDetails.details.metacriticScore >= 50
                                                                ? 'bg-amber-500/10 border-amber-500/30'
                                                                : 'bg-red-500/10 border-red-500/30'
                                                            }`}>
                                                            <span className="text-[8px] font-mono uppercase tracking-[0.1em] text-white/40 mb-0.5">Metacritic</span>
                                                            <span className={`text-2xl font-display font-black italic ${gameDetails.details.metacriticScore >= 75
                                                                ? 'text-emerald-400'
                                                                : gameDetails.details.metacriticScore >= 50
                                                                    ? 'text-amber-400'
                                                                    : 'text-red-400'
                                                                }`}>
                                                                {gameDetails.details.metacriticScore}
                                                            </span>
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}

                                        {/* Metadata Row - Inline chips */}
                                        <div className="flex flex-wrap items-center gap-3 mb-10">
                                            {gameDetails?.details && (
                                                <>
                                                    {gameDetails.details.developers[0] && (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-xs font-mono">
                                                            <span className="text-white/30">DEV</span>
                                                            <span className="text-white/70">{gameDetails.details.developers[0]}</span>
                                                        </span>
                                                    )}
                                                    {gameDetails.details.publishers[0] && gameDetails.details.publishers[0] !== gameDetails.details.developers[0] && (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-xs font-mono">
                                                            <span className="text-white/30">PUB</span>
                                                            <span className="text-white/70">{gameDetails.details.publishers[0]}</span>
                                                        </span>
                                                    )}
                                                    <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-white/5 border border-white/10 text-xs font-mono">
                                                        <span className="text-white/30">REL</span>
                                                        <span className="text-white/70">{gameDetails.details.releaseDate}</span>
                                                    </span>
                                                    {achievementsData?.success && achievementsData.totalAchievements > 0 && (
                                                        <span className="inline-flex items-center gap-2 px-3 py-1.5 bg-crimson-500/10 border border-crimson-500/20 text-xs font-mono">
                                                            <span className="text-crimson-500/60">🏆</span>
                                                            <span className="text-crimson-400">{achievementsData.unlockedCount}/{achievementsData.totalAchievements}</span>
                                                        </span>
                                                    )}
                                                </>
                                            )}
                                            {detailsLoading && (
                                                <>
                                                    <div className="h-8 w-32 bg-void-surface border border-void-border animate-pulse" />
                                                    <div className="h-8 w-28 bg-void-surface border border-void-border animate-pulse" />
                                                    <div className="h-8 w-24 bg-void-surface border border-void-border animate-pulse" />
                                                </>
                                            )}
                                        </div>

                                        {/* Game Description */}
                                        {gameDetails?.details?.shortDescription && (
                                            <div className="mb-10">
                                                <h3 className="text-xs font-mono text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <span className="w-1 h-1 bg-crimson-500" />
                                                    ABOUT THIS GAME
                                                </h3>
                                                <div className="bg-black/20 border border-white/5 p-6">
                                                    <p className="text-sm text-white/70 leading-relaxed">
                                                        {gameDetails.details.shortDescription}
                                                    </p>
                                                    {gameDetails.details.genres.length > 0 && (
                                                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-white/5">
                                                            {gameDetails.details.genres.map((genre, i) => (
                                                                <span key={i} className="text-xs font-mono px-2 py-1 bg-white/5 border border-white/10 text-white/50">
                                                                    {genre}
                                                                </span>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                        {detailsLoading && (
                                            <div className="mb-10">
                                                <div className="h-4 bg-void-border w-32 mb-4 animate-pulse" />
                                                <div className="bg-void-surface border border-void-border p-6 animate-pulse">
                                                    <div className="h-4 bg-void-border w-full mb-2" />
                                                    <div className="h-4 bg-void-border w-3/4" />
                                                </div>
                                            </div>
                                        )}

                                        {/* System Requirements */}
                                        {gameDetails?.details?.pcRequirements?.minimum && (
                                            <div className="mb-10">
                                                <h3 className="text-xs font-mono text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                    <span className="w-1 h-1 bg-crimson-500" />
                                                    SYSTEM REQUIREMENTS
                                                </h3>
                                                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                                                    {gameDetails.details.pcRequirements.minimum && (
                                                        <div className="bg-black/20 border border-white/5 p-5">
                                                            <h4 className="text-xs font-mono text-crimson-500 uppercase tracking-wider mb-3">Minimum</h4>
                                                            <div
                                                                className="text-xs text-white/50 leading-relaxed space-y-1 [&_strong]:text-white/70 [&_br]:hidden [&_ul]:list-none [&_ul]:p-0 [&_li]:py-0.5"
                                                                dangerouslySetInnerHTML={{ __html: gameDetails.details.pcRequirements.minimum }}
                                                            />
                                                        </div>
                                                    )}
                                                    {gameDetails.details.pcRequirements.recommended && (
                                                        <div className="bg-black/20 border border-white/5 p-5">
                                                            <h4 className="text-xs font-mono text-emerald-500 uppercase tracking-wider mb-3">Recommended</h4>
                                                            <div
                                                                className="text-xs text-white/50 leading-relaxed space-y-1 [&_strong]:text-white/70 [&_br]:hidden [&_ul]:list-none [&_ul]:p-0 [&_li]:py-0.5"
                                                                dangerouslySetInnerHTML={{ __html: gameDetails.details.pcRequirements.recommended }}
                                                            />
                                                        </div>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </motion.div>
                                )}

                                {activeTab === 'achievements' && selectedGame.steamAppId && (
                                    <motion.div
                                        key="achievements"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <AchievementsTab data={achievementsData} isLoading={achievementsLoading} />
                                    </motion.div>
                                )}

                                {activeTab === 'achievements' && !selectedGame.steamAppId && (
                                    <motion.div
                                        key="achievements-unavailable"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-20 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-void-surface flex items-center justify-center mb-6">
                                            <Terminal className="w-8 h-8 text-white/20" />
                                        </div>
                                        <h3 className="text-xl font-display font-bold italic text-white/60 mb-2">
                                            NOT AVAILABLE
                                        </h3>
                                        <p className="text-sm text-white/30">
                                            Achievements are only available for Steam games
                                        </p>
                                    </motion.div>
                                )}

                                {activeTab === 'patchnotes' && selectedGame.steamAppId && (
                                    <motion.div
                                        key="patchnotes"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.2 }}
                                    >
                                        <PatchNotesTab data={newsData} isLoading={newsLoading} />
                                    </motion.div>
                                )}

                                {activeTab === 'patchnotes' && !selectedGame.steamAppId && (
                                    <motion.div
                                        key="patchnotes-unavailable"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-20 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-void-surface flex items-center justify-center mb-6">
                                            <Terminal className="w-8 h-8 text-white/20" />
                                        </div>
                                        <h3 className="text-xl font-display font-bold italic text-white/60 mb-2">
                                            NOT AVAILABLE
                                        </h3>
                                        <p className="text-sm text-white/30">
                                            Patch notes are only available for Steam games
                                        </p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="h-24 border-t border-white/5 bg-black/20 flex items-center justify-between px-10 shrink-0">
                                {/* Left side - Uninstall (only for installed games) */}
                                <div>
                                    {selectedGame.isInstalled ? (
                                        <motion.button
                                            onClick={handleDelete}
                                            className={`
                                                flex items-center gap-3 px-6 py-3
                                                text-xs font-mono font-bold uppercase tracking-wider
                                                border transition-all duration-300
                                                ${isDeleting
                                                    ? 'border-red-500 text-red-500 bg-red-500/10'
                                                    : 'border-white/10 text-white/30 hover:text-red-500 hover:border-red-500/50'
                                                }
                                            `}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Trash2 className="w-4 h-4" />
                                            <span>{isDeleting ? 'Confirm Delete?' : 'Uninstall'}</span>
                                        </motion.button>
                                    ) : (
                                        /* Placeholder to maintain layout */
                                        <div className="flex items-center gap-2 text-white/20 text-xs font-mono">
                                            <Terminal className="w-4 h-4" />
                                            <span>Not installed locally</span>
                                        </div>
                                    )}
                                </div>

                                {/* Right side - Primary Action */}
                                {selectedGame.isInstalled ? (
                                    <motion.button
                                        onClick={handlePlay}
                                        className="
                                            group relative flex items-center gap-4 px-10 py-4
                                            bg-crimson-600 hover:bg-crimson-500
                                            text-white font-display font-black italic uppercase tracking-tighter text-2xl
                                            clip-path-slant shadow-[0_0_30px_rgba(220,38,38,0.4)]
                                            hover:shadow-[0_0_50px_rgba(220,38,38,0.6)]
                                            transition-all duration-300
                                        "
                                        style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <span>LAUNCH</span>
                                        <Play className="w-6 h-6 fill-current group-hover:translate-x-1 transition-transform" />
                                    </motion.button>
                                ) : selectedGame.steamAppId ? (
                                    <motion.button
                                        onClick={handleInstall}
                                        disabled={isInstalling}
                                        className="
                                            group relative flex items-center gap-4 px-10 py-4
                                            bg-gradient-to-r from-amber-500 to-amber-400  
                                            hover:from-amber-400 hover:to-amber-300
                                            disabled:from-amber-500/50 disabled:to-amber-400/50
                                            text-black font-display font-black italic uppercase tracking-tighter text-2xl
                                            shadow-[0_0_30px_rgba(245,158,11,0.3)]
                                            hover:shadow-[0_0_50px_rgba(245,158,11,0.5)]
                                            transition-all duration-300
                                        "
                                        style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                                        whileHover={{ scale: isInstalling ? 1 : 1.05 }}
                                        whileTap={{ scale: isInstalling ? 1 : 0.95 }}
                                    >
                                        {isInstalling ? (
                                            <>
                                                <motion.div
                                                    animate={{ rotate: 360 }}
                                                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                                >
                                                    <Download className="w-6 h-6" />
                                                </motion.div>
                                                <span>OPENING...</span>
                                            </>
                                        ) : (
                                            <>
                                                <span>INSTALL</span>
                                                <Download className="w-6 h-6 group-hover:translate-y-0.5 transition-transform" />
                                            </>
                                        )}
                                    </motion.button>
                                ) : (
                                    /* Non-Steam game that's not installed - disabled state */
                                    <div
                                        className="
                                            flex items-center gap-4 px-10 py-4
                                            bg-void-surface border border-white/10
                                            text-white/30 font-display font-bold italic uppercase tracking-tighter text-xl
                                            cursor-not-allowed
                                        "
                                        style={{ clipPath: 'polygon(10px 0, 100% 0, 100% calc(100% - 10px), calc(100% - 10px) 100%, 0 100%, 0 10px)' }}
                                    >
                                        <span>NOT AVAILABLE</span>
                                        <Terminal className="w-5 h-5" />
                                    </div>
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
