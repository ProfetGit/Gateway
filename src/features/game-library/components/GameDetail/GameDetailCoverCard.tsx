import { motion } from 'framer-motion'
import type { Game } from '../../game-library-types'

export type GameDetailCoverCardProps = {
    game: Game
    imgSrc: string | undefined
    bannerSrc: string | undefined
    onImageError: () => void
}

export function GameDetailCoverCard({ game, imgSrc, bannerSrc, onImageError }: GameDetailCoverCardProps) {
    return (
        <motion.div
            className="absolute left-8 top-72 -translate-y-1/2 z-30 w-36 overflow-hidden border border-void-border/60 shadow-void-float pointer-events-none"
            style={{ aspectRatio: '3 / 4' }}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.12, duration: 0.3 }}
        >
            {(imgSrc ?? bannerSrc) ? (
                <img
                    src={imgSrc ?? bannerSrc}
                    className="w-full h-full object-cover pointer-events-auto"
                    onError={onImageError}
                    alt={game.title}
                />
            ) : (
                <div className="w-full h-full bg-void-surface flex items-center justify-center pointer-events-auto">
                    <span className="text-4xl font-display font-black text-white/5">
                        {game.title.charAt(0)}
                    </span>
                </div>
            )}
            <div className="absolute inset-0 bg-scanlines opacity-20 pointer-events-none" />
            {/* The breach line — crimson rule at the seam */}
            <div className="absolute top-1/2 inset-x-0 h-px bg-crimson-500/60 pointer-events-none" />
            {game.isInstalled && (
                <div className="absolute bottom-0 inset-x-0 flex items-center gap-1 px-2 py-1 bg-black/70">
                    <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full" />
                    <span className="text-[8px] font-mono uppercase tracking-wider text-emerald-400">Installed</span>
                </div>
            )}
        </motion.div>
    )
}
