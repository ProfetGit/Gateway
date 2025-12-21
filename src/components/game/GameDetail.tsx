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
                        className="fixed inset-0 bg-black/90 backdrop-blur-md z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeDetail}
                    />

                    {/* Portal Container */}
                    <motion.div
                        className="fixed inset-0 z-50 overflow-hidden"
                        initial={{
                            opacity: 0,
                            clipPath: 'circle(0% at 50% 50%)',
                        }}
                        animate={{
                            opacity: 1,
                            clipPath: 'circle(150% at 50% 50%)',
                        }}
                        exit={{
                            opacity: 0,
                            clipPath: 'circle(0% at 50% 50%)',
                        }}
                        transition={{
                            duration: 0.5,
                            ease: [0.16, 1, 0.3, 1],
                        }}
                    >
                        <div className="h-full w-full flex bg-void-pure">
                            {/* ═══════════════════════════════════════════════════════════
                               COVER PANEL - Left side, full bleed
                               ═══════════════════════════════════════════════════════════ */}
                            <div className="relative w-[55%] h-full shrink-0 overflow-hidden">
                                {/* Ambient bleed - extends behind details panel */}
                                {selectedGame.coverUrl && (
                                    <div
                                        className="absolute inset-0 -right-[40%] ambient-bleed pointer-events-none"
                                        style={{ backgroundImage: `url(${selectedGame.coverUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                                    />
                                )}

                                {/* Main cover image with dissolve mask */}
                                {selectedGame.coverUrl ? (
                                    <motion.div
                                        className="absolute inset-0 cover-dissolve"
                                        initial={{ opacity: 0, x: -40, scale: 1.1 }}
                                        animate={{ opacity: 1, x: 0, scale: 1 }}
                                        exit={{ opacity: 0, x: -20 }}
                                        transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                                    >
                                        <img
                                            src={selectedGame.coverUrl}
                                            alt={selectedGame.title}
                                            className="w-full h-full object-cover object-top"
                                        />
                                    </motion.div>
                                ) : (
                                    /* Fallback monogram */
                                    <motion.div
                                        className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-void-surface to-void-pure cover-dissolve"
                                        initial={{ opacity: 0 }}
                                        animate={{ opacity: 1 }}
                                        transition={{ duration: 0.4 }}
                                    >
                                        <motion.span
                                            className="text-[20rem] font-etched text-crimson-950/30 select-none"
                                            animate={{
                                                textShadow: [
                                                    '0 0 60px rgba(255, 58, 58, 0.1)',
                                                    '0 0 120px rgba(255, 58, 58, 0.2)',
                                                    '0 0 60px rgba(255, 58, 58, 0.1)',
                                                ],
                                            }}
                                            transition={{ duration: 3, repeat: Infinity }}
                                        >
                                            {selectedGame.title.charAt(0)}
                                        </motion.span>
                                    </motion.div>
                                )}

                                {/* Gradient seam - luminous edge */}
                                <div className="absolute top-0 right-0 bottom-0 w-32 bg-gradient-to-r from-transparent via-void-pure/50 to-void-pure pointer-events-none" />

                                {/* Bottom vignette */}
                                <div className="absolute bottom-0 left-0 right-0 h-1/4 bg-gradient-to-t from-void-pure to-transparent pointer-events-none" />
                            </div>

                            {/* ═══════════════════════════════════════════════════════════
                               DETAILS PANEL - Right side, content overlaid
                               ═══════════════════════════════════════════════════════════ */}
                            <div className="relative flex-1 flex flex-col py-12 px-16 overflow-y-auto scrollbar-hide z-10">
                                {/* Close button - top right, unobtrusive */}
                                <motion.button
                                    onClick={closeDetail}
                                    className="absolute top-6 right-6 p-3 text-text-muted/50 hover:text-text-primary hover:bg-void-surface/50 rounded-full transition-all duration-200"
                                    initial={{ opacity: 0 }}
                                    animate={{ opacity: 1 }}
                                    transition={{ delay: 0.5 }}
                                    whileHover={{ scale: 1.1, backgroundColor: 'rgba(255, 58, 58, 0.1)' }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X className="w-5 h-5" />
                                </motion.button>

                                {/* Title & Status */}
                                <motion.div
                                    initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                                    transition={{ delay: 0.25, duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                                >
                                    <h1 className="text-5xl font-bold text-text-primary mb-4 leading-tight">
                                        {selectedGame.title}
                                    </h1>
                                    <div className="flex items-center gap-3 mb-10">
                                        {selectedGame.source === 'steam' && (
                                            <span className="px-3 py-1.5 text-xs font-mono bg-void-surface text-text-muted rounded border border-void-border uppercase tracking-widest">
                                                Steam
                                            </span>
                                        )}
                                        {selectedGame.isInstalled ? (
                                            <span className="flex items-center gap-2 px-3 py-1.5 text-xs font-mono text-emerald-400 bg-emerald-950/30 rounded border border-emerald-900/30">
                                                <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse" />
                                                INSTALLED
                                            </span>
                                        ) : (
                                            <span className="px-3 py-1.5 text-xs font-mono text-text-ghost bg-void-surface/50 rounded border border-void-border/50">
                                                NOT INSTALLED
                                            </span>
                                        )}
                                    </div>
                                </motion.div>

                                {/* Stats Grid */}
                                <motion.div
                                    className="grid grid-cols-2 gap-4 mb-10"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.35, duration: 0.5 }}
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
                                        className="mb-10"
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.4, duration: 0.4 }}
                                    >
                                        <h3 className="text-xs font-mono text-text-muted uppercase tracking-widest mb-3">
                                            Notes
                                        </h3>
                                        <p className="text-sm text-text-secondary leading-relaxed max-w-md">
                                            {selectedGame.notes}
                                        </p>
                                    </motion.div>
                                )}

                                {/* Spacer */}
                                <div className="flex-1 min-h-8" />

                                {/* Action Bar */}
                                <motion.div
                                    className="flex items-center gap-4"
                                    initial={{ opacity: 0, y: 30 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    transition={{ delay: 0.45, duration: 0.5 }}
                                >
                                    {/* Play Button - Hero action */}
                                    <motion.button
                                        onClick={handlePlay}
                                        className="
                                            flex items-center gap-3 px-8 py-4
                                            bg-crimson-600 hover:bg-crimson-500 
                                            text-white text-lg font-semibold
                                            rounded-xl shadow-crimson-glow
                                            transition-all duration-200
                                        "
                                        whileHover={{ scale: 1.02, boxShadow: '0 0 50px rgba(255, 58, 58, 0.5)' }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Play className="w-6 h-6 fill-current" />
                                        <span>Play Now</span>
                                    </motion.button>

                                    {/* Favorite */}
                                    <motion.button
                                        onClick={() => toggleFavorite(selectedGame.id)}
                                        className={`
                                            p-4 rounded-xl transition-all duration-200
                                            ${selectedGame.isFavorite
                                                ? 'bg-crimson-600/20 text-crimson-400 border border-crimson-600/30'
                                                : 'bg-void-surface text-text-muted hover:text-crimson-400 border border-void-border hover:border-crimson-900/30'
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
                                            className="p-4 bg-void-surface text-text-muted hover:text-text-primary rounded-xl border border-void-border hover:border-void-border/80 transition-all duration-200"
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
                                            flex items-center gap-2 px-5 py-4 rounded-xl transition-all duration-200
                                            ${isDeleting
                                                ? 'bg-red-600 text-white'
                                                : 'bg-void-surface text-text-muted hover:text-red-400 hover:bg-red-950/20 border border-void-border hover:border-red-900/30'
                                            }
                                        `}
                                        whileHover={{ scale: 1.02 }}
                                        whileTap={{ scale: 0.98 }}
                                    >
                                        <Trash2 className="w-4 h-4" />
                                        <span className="text-sm font-medium">
                                            {isDeleting ? 'Click to Confirm' : 'Remove'}
                                        </span>
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
        <div className="bg-void-surface/80 backdrop-blur-sm border border-void-border rounded-xl p-5">
            <div className="flex items-center gap-2 text-text-muted mb-2">
                {icon}
                <span className="text-xs font-mono uppercase tracking-widest">{label}</span>
            </div>
            <span className="text-xl font-semibold text-text-primary">{value}</span>
        </div>
    )
}
