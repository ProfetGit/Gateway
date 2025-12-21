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
    Monitor
} from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useState, useEffect, useRef } from 'react'
import { AchievementsTab } from './AchievementsTab'
import type { FetchAchievementsResult } from '../../types/game'

type TabType = 'overview' | 'achievements' | 'patchnotes'

export function GameDetail() {
    const { selectedGame, isDetailOpen, closeDetail, toggleFavorite, deleteGame } = useGameStore()
    const [isDeleting, setIsDeleting] = useState(false)
    const [imgSrc, setImgSrc] = useState<string | undefined>(undefined)
    const [imageError, setImageError] = useState(false)
    const [activeTab, setActiveTab] = useState<TabType>('overview')

    // Achievements cache - only fetch once per game
    const [achievementsData, setAchievementsData] = useState<FetchAchievementsResult | null>(null)
    const [achievementsLoading, setAchievementsLoading] = useState(false)
    const fetchedAppIdRef = useRef<string | null>(null)

    // Reset tab and cache when game changes
    useEffect(() => {
        setActiveTab('overview')
        setAchievementsData(null)
        fetchedAppIdRef.current = null
    }, [selectedGame?.id])

    // Fetch achievements when switching to achievements tab (only once per game)
    useEffect(() => {
        if (activeTab !== 'achievements') return
        if (!selectedGame?.steamAppId) return
        if (fetchedAppIdRef.current === selectedGame.steamAppId) return

        fetchedAppIdRef.current = selectedGame.steamAppId
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
                                                    <div className={`w-3 h-3 rounded-full ${selectedGame.isInstalled ? 'bg-emerald-500 shadow-[0_0_10px_#10b981]' : 'bg-white/10'}`} />
                                                    <span className={`text-2xl font-display font-bold italic uppercase ${selectedGame.isInstalled ? 'text-white' : 'text-white/40'}`}>
                                                        {selectedGame.isInstalled ? 'INSTALLED' : 'NOT INSTALLED'}
                                                    </span>
                                                </div>
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

                                        {/* Stats Grid */}
                                        <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10 mb-12">
                                            <StatBox
                                                icon={<Clock className="w-4 h-4 text-crimson-500" />}
                                                label="Total Runtime"
                                                value={formatPlaytime(selectedGame.playtime)}
                                            />
                                            <StatBox
                                                icon={<Calendar className="w-4 h-4 text-crimson-500" />}
                                                label="Last Session"
                                                value={formatDate(selectedGame.lastPlayed)}
                                            />
                                        </div>

                                        {/* Notes Section */}
                                        <div className="mb-12">
                                            <h3 className="text-xs font-mono text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                                                <span className="w-1 h-1 bg-crimson-500" />
                                                NOTES
                                            </h3>
                                            <div className="bg-black/20 border border-white/5 p-6 font-mono text-sm text-white/60 leading-relaxed min-h-[100px]">
                                                {selectedGame.notes || "No notes available."}
                                            </div>
                                        </div>
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

                                {activeTab === 'patchnotes' && (
                                    <motion.div
                                        key="patchnotes"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        className="flex flex-col items-center justify-center py-20 text-center"
                                    >
                                        <div className="w-16 h-16 rounded-full bg-void-surface flex items-center justify-center mb-6">
                                            <Terminal className="w-8 h-8 text-white/20" />
                                        </div>
                                        <h3 className="text-xl font-display font-bold italic text-white/60 mb-2">
                                            COMING SOON
                                        </h3>
                                        <p className="text-sm text-white/30">
                                            Patch notes will be available in a future update
                                        </p>
                                    </motion.div>
                                )}
                            </div>

                            {/* Footer Actions */}
                            <div className="h-24 border-t border-white/5 bg-black/20 flex items-center justify-between px-10 shrink-0">
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
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

function StatBox({ icon, label, value }: { icon: React.ReactNode, label: string, value: string }) {
    return (
        <div className="bg-void-surface p-6 flex flex-col gap-2 group hover:bg-white/5 transition-colors">
            <div className="flex items-center gap-3 mb-1">
                {icon}
                <span className="text-[10px] font-mono uppercase tracking-[0.2em] text-white/30 group-hover:text-white/50 transition-colors">{label}</span>
            </div>
            <span className="text-2xl font-display font-bold italic text-white tracking-tight">{value}</span>
        </div>
    )
}
