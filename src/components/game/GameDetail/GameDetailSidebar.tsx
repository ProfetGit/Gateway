import { motion } from 'framer-motion'
import { Game } from '../../../types/game'
import { FetchGameDetailsResult } from '../../../types/game'
import {
    ExternalLink,
    Monitor,
    Star,
    Trash2
} from 'lucide-react'
import { InfoRow } from './StatCards'

interface GameDetailSidebarProps {
    selectedGame: Game
    imgSrc: string | undefined
    gameDetails: FetchGameDetailsResult | null
    isDeleting: boolean
    toggleFavorite: (id: string) => void
    handleDelete: () => void
    handleImageError: () => void
}

export function GameDetailSidebar({
    selectedGame,
    imgSrc,
    gameDetails,
    isDeleting,
    toggleFavorite,
    handleDelete,
    handleImageError
}: GameDetailSidebarProps) {
    return (
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
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_oklch(0.72_0.17_165/0.8)]" />
                            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400">Installed</span>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Quick Info */}
            <div className="flex-1 px-4 pb-4 z-10 space-y-3 overflow-y-auto scrollbar-hide">
                <div className="space-y-2">
                    <InfoRow label="From" value={selectedGame.source ? selectedGame.source.charAt(0).toUpperCase() + selectedGame.source.slice(1) : 'Local'} icon={<Monitor size={12} />} />
                    <InfoRow label="Status" value={selectedGame.isInstalled ? 'Ready to play' : 'Not installed'} />
                    {selectedGame.sizeOnDisk && (
                        <InfoRow label="Size" value={`${(selectedGame.sizeOnDisk / 1073741824).toFixed(1)} GB`} />
                    )}
                    {gameDetails?.details?.releaseDate && (
                        <InfoRow label="Released" value={gameDetails.details.releaseDate} />
                    )}
                </div>

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
    )
}
