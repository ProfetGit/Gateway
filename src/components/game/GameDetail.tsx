import { motion, AnimatePresence } from 'framer-motion'
import {
    X,
    Play,
    Heart,
    Trash2,
    Clock,
    Calendar,
    ExternalLink,
} from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useState } from 'react'

export function GameDetail() {
    const { selectedGame, isDetailOpen, closeDetail, toggleFavorite, deleteGame } = useGameStore()
    const [isDeleting, setIsDeleting] = useState(false)

    if (!selectedGame) return null

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
            // Reset after 3 seconds
            setTimeout(() => setIsDeleting(false), 3000)
        }
    }

    const formatDate = (dateString?: string) => {
        if (!dateString) return 'Never'
        return new Date(dateString).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
            year: 'numeric',
        })
    }

    const formatPlaytime = (minutes?: number) => {
        if (!minutes) return '0h'
        const hours = Math.floor(minutes / 60)
        const mins = minutes % 60
        return hours > 0 ? `${hours}h ${mins}m` : `${mins}m`
    }

    return (
        <AnimatePresence>
            {isDetailOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeDetail}
                    />

                    {/* Portal */}
                    <motion.div
                        className="fixed inset-4 z-50 overflow-hidden rounded-2xl"
                        initial={{
                            opacity: 0,
                            scale: 0.8,
                            clipPath: 'circle(0% at 50% 50%)',
                        }}
                        animate={{
                            opacity: 1,
                            scale: 1,
                            clipPath: 'circle(150% at 50% 50%)',
                        }}
                        exit={{
                            opacity: 0,
                            scale: 0.95,
                            clipPath: 'circle(0% at 50% 50%)',
                        }}
                        transition={{
                            duration: 0.5,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                    >
                        <div className="h-full bg-void-pure flex">
                            {/* Cover Side */}
                            <div className="relative w-1/3 min-w-[300px] max-w-[400px] shrink-0">
                                {/* Background blur */}
                                {selectedGame.coverUrl && (
                                    <div
                                        className="absolute inset-0 bg-cover bg-center blur-3xl opacity-30 scale-110"
                                        style={{ backgroundImage: `url(${selectedGame.coverUrl})` }}
                                    />
                                )}

                                {/* Cover image */}
                                <div className="relative h-full p-6 flex items-center justify-center">
                                    {selectedGame.coverUrl ? (
                                        <motion.img
                                            src={selectedGame.coverUrl}
                                            alt={selectedGame.title}
                                            className="max-h-full max-w-full object-contain rounded-lg shadow-void-float"
                                            initial={{ opacity: 0, y: 20 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: 0.2, duration: 0.4 }}
                                        />
                                    ) : (
                                        <div className="w-48 h-64 bg-void-surface rounded-lg flex items-center justify-center">
                                            <span className="text-6xl font-etched text-crimson-900/50">
                                                {selectedGame.title.charAt(0)}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {/* Crimson glow accent */}
                                <div className="absolute bottom-0 left-0 right-0 h-1/3 bg-gradient-to-t from-crimson-950/30 to-transparent pointer-events-none" />
                            </div>

                            {/* Content Side */}
                            <div className="flex-1 flex flex-col p-8 overflow-hidden">
                                {/* Header */}
                                <div className="flex items-start justify-between mb-6">
                                    <motion.div
                                        initial={{ opacity: 0, x: -20 }}
                                        animate={{ opacity: 1, x: 0 }}
                                        transition={{ delay: 0.15 }}
                                    >
                                        <h1 className="text-4xl font-bold text-text-primary mb-2">
                                            {selectedGame.title}
                                        </h1>
                                        <div className="flex items-center gap-3">
                                            {selectedGame.source === 'steam' && (
                                                <span className="px-2 py-1 text-xs font-mono bg-void-surface text-text-muted rounded border border-void-border">
                                                    STEAM
                                                </span>
                                            )}
                                            {selectedGame.isInstalled ? (
                                                <span className="flex items-center gap-1.5 text-xs font-mono text-emerald-400">
                                                    <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                                                    INSTALLED
                                                </span>
                                            ) : (
                                                <span className="text-xs font-mono text-text-muted">NOT INSTALLED</span>
                                            )}
                                        </div>
                                    </motion.div>

                                    <motion.button
                                        onClick={closeDetail}
                                        className="p-2 text-text-muted hover:text-text-primary hover:bg-void-surface rounded-lg transition-colors"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <X className="w-5 h-5" />
                                    </motion.button>
                                </div>

                                {/* Stats */}
                                <motion.div
                                    className="grid grid-cols-2 gap-4 mb-8"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.25 }}
                                >
                                    <StatCard
                                        icon={<Clock className="w-4 h-4" />}
                                        label="Playtime"
                                        value={formatPlaytime(selectedGame.playtime)}
                                    />
                                    <StatCard
                                        icon={<Calendar className="w-4 h-4" />}
                                        label="Last Played"
                                        value={formatDate(selectedGame.lastPlayed)}
                                    />
                                </motion.div>

                                {/* Notes */}
                                {selectedGame.notes && (
                                    <motion.div
                                        className="mb-8"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.3 }}
                                    >
                                        <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
                                            Notes
                                        </h3>
                                        <p className="text-sm text-text-secondary leading-relaxed">
                                            {selectedGame.notes}
                                        </p>
                                    </motion.div>
                                )}

                                {/* Spacer */}
                                <div className="flex-1" />

                                {/* Actions */}
                                <motion.div
                                    className="flex items-center gap-3"
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35 }}
                                >
                                    {/* Play */}
                                    <motion.button
                                        onClick={handlePlay}
                                        className="
                      flex items-center gap-2 px-6 py-3
                      bg-crimson-600 hover:bg-crimson-500 
                      text-white font-medium
                      rounded-lg shadow-crimson-glow
                      transition-all duration-200
                    "
                                        whileHover={{ scale: 1.02, boxShadow: '0 0 40px rgba(255, 58, 58, 0.5)' }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Play className="w-5 h-5 fill-current" />
                                        <span>Play Now</span>
                                    </motion.button>

                                    {/* Favorite */}
                                    <motion.button
                                        onClick={() => toggleFavorite(selectedGame.id)}
                                        className={`
                      p-3 rounded-lg transition-colors
                      ${selectedGame.isFavorite
                                                ? 'bg-crimson-600/20 text-crimson-400 border border-crimson-600/30'
                                                : 'bg-void-surface text-text-muted hover:text-crimson-400 border border-void-border'
                                            }
                    `}
                                        whileHover={{ scale: 1.05 }}
                                        whileTap={{ scale: 0.95 }}
                                    >
                                        <Heart className={`w-5 h-5 ${selectedGame.isFavorite ? 'fill-current' : ''}`} />
                                    </motion.button>

                                    {/* Steam Link */}
                                    {selectedGame.steamAppId && (
                                        <motion.a
                                            href={`https://store.steampowered.com/app/${selectedGame.steamAppId}`}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="p-3 bg-void-surface text-text-muted hover:text-text-primary rounded-lg border border-void-border transition-colors"
                                            whileHover={{ scale: 1.05 }}
                                            whileTap={{ scale: 0.95 }}
                                        >
                                            <ExternalLink className="w-5 h-5" />
                                        </motion.a>
                                    )}

                                    <div className="flex-1" />

                                    {/* Delete */}
                                    <motion.button
                                        onClick={handleDelete}
                                        className={`
                      flex items-center gap-2 px-4 py-3 rounded-lg transition-all
                      ${isDeleting
                                                ? 'bg-red-600 text-white'
                                                : 'bg-void-surface text-text-muted hover:text-red-400 hover:bg-red-950/30 border border-void-border hover:border-red-900/30'
                                            }
                    `}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="text-sm">{isDeleting ? 'Click to Confirm' : 'Remove'}</span>
                                    </motion.button>
                                </motion.div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

interface StatCardProps {
    icon: React.ReactNode
    label: string
    value: string
}

function StatCard({ icon, label, value }: StatCardProps) {
    return (
        <div className="bg-void-surface border border-void-border rounded-lg p-4">
            <div className="flex items-center gap-2 text-text-muted mb-1">
                {icon}
                <span className="text-xs font-mono uppercase tracking-wider">{label}</span>
            </div>
            <span className="text-lg font-medium text-text-primary">{value}</span>
        </div>
    )
}
