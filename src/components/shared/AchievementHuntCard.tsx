import React from 'react'
import { motion } from 'framer-motion'
import { Download } from 'lucide-react'
import type { Game } from '../../types/game'

interface AchievementHuntCardProps {
    game: Game
    unlocked: number
    total: number
    percentage: number
    index: number
    onClick: () => void
}

export function AchievementHuntCard({ game, unlocked, total, percentage, index, onClick }: AchievementHuntCardProps) {
    const [imageError, setImageError] = React.useState(false)
    const remaining = total - unlocked

    const heroUrl = game.steamAppId
        ? `https://cdn.akamai.steamstatic.com/steam/apps/${game.steamAppId}/library_hero.jpg`
        : game.heroImageUrl || game.coverUrl

    return (
        <motion.button
            initial={{ opacity: 0, y: 24 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08, duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
            whileHover={{ y: -6 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            style={{ aspectRatio: '5 / 4' }}
            className="group relative w-full rounded-lg overflow-hidden bg-void-deep border border-void-border/40 shadow-lg hover:border-crimson-500/60 hover:shadow-[0_12px_40px_oklch(0.52_0.23_25/0.35)] focus:outline-none transition-[border-color,box-shadow] duration-300 ease-out-expo text-left isolate"
        >
            {/* ═══ BACKDROP ═══ blurred cover, deliberately recessive */}
            <div className="absolute inset-0 overflow-hidden">
                {!imageError && heroUrl ? (
                    <img
                        src={heroUrl}
                        alt=""
                        aria-hidden
                        onError={() => setImageError(true)}
                        className="w-full h-full object-cover transition-transform duration-700 ease-out group-hover:scale-105"
                        style={{
                            filter: game.isInstalled
                                ? 'brightness(0.85) saturate(1.15) contrast(1.05)'
                                : 'brightness(0.55) saturate(0.75) grayscale(0.4)',
                        }}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-void-surface via-void-deep to-void-pure" />
                )}

                {/* Crimson wash — bottom-left tint, lighter than before */}
                <div className="absolute inset-0 bg-gradient-to-tr from-crimson-950/35 via-transparent to-transparent" />

                {/* Bottom scrim — strong dark only where title/progress sit; top stays open for cover */}
                <div className="absolute inset-0 bg-gradient-to-t from-void-pure/95 via-void-pure/30 to-transparent" />

                {/* Scanline texture */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0/0.04)_3px)] pointer-events-none" />
            </div>

            {/* ═══ CORNER BRACKETS ═══ resting state subtle, hover saturates */}
            <div className="absolute top-0 left-0 w-7 h-7 border-t-[3px] border-l-[3px] border-crimson-800/60 group-hover:border-crimson-500 transition-colors duration-300 pointer-events-none z-20" />
            <div className="absolute bottom-0 right-0 w-7 h-7 border-b-[3px] border-r-[3px] border-crimson-800/60 group-hover:border-crimson-500 transition-colors duration-300 pointer-events-none z-20" />

            {/* ═══ NOT-INSTALLED HINT ═══ top-right, only when relevant */}
            {!game.isInstalled && (
                <div className="absolute top-3 right-3 z-30 flex items-center gap-1.5 px-2 py-1 bg-void-pure/85 backdrop-blur-sm border border-white/20 rounded">
                    <Download className="w-3 h-3 text-white/70" />
                    <span className="text-[9px] font-mono font-black text-white/80 uppercase tracking-widest">
                        Install
                    </span>
                </div>
            )}

            {/* ═══ HEADLINE: massive italic percentage ═══ */}
            <div className="absolute top-5 left-5 z-10 flex items-start gap-1 pointer-events-none">
                <span
                    className="font-display font-black italic text-white leading-[0.85] tracking-[-0.06em] transition-colors duration-300 group-hover:text-crimson-100"
                    style={{
                        fontSize: '4.5rem',
                        textShadow: '0 4px 24px oklch(0.08 0.005 25 / 0.95), 0 2px 8px oklch(0.08 0.005 25 / 0.8)',
                    }}
                >
                    {percentage}
                </span>
                <span
                    className="font-display font-black italic text-crimson-500 leading-[1] mt-2 transition-transform duration-300 group-hover:translate-x-1"
                    style={{
                        fontSize: '1.875rem',
                        textShadow: '0 2px 12px oklch(0.08 0.005 25 / 0.9)',
                    }}
                >
                    %
                </span>
            </div>

            {/* ═══ BOTTOM PANEL: game info + progress bar ═══ */}
            <div className="absolute bottom-0 left-0 right-0 z-10 px-5 pt-3 pb-4">
                {/* Progress bar — promoted to 3px crimson with glow */}
                <div className="relative h-[3px] bg-void-pure/70 mb-4 overflow-hidden rounded-full">
                    <motion.div
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: percentage / 100 }}
                        transition={{ delay: index * 0.08 + 0.25, duration: 0.9, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-y-0 left-0 right-0 bg-crimson-500 origin-left shadow-[0_0_10px_oklch(0.58_0.245_25/0.7)]"
                    />
                </div>

                <h3
                    className="text-etched text-base text-white leading-tight truncate group-hover:text-crimson-100 transition-colors duration-300"
                    title={game.title}
                >
                    {game.title}
                </h3>

                <div className="mt-1.5 flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/60">
                    <span className="text-white/80">{unlocked} / {total}</span>
                    <span className="text-crimson-500/70">·</span>
                    <span className="text-crimson-400">{remaining} to go</span>
                </div>
            </div>
        </motion.button>
    )
}
