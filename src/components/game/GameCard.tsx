import { useState } from 'react'
import { motion } from 'framer-motion'
import { Play, Heart, Star, Download } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import type { Game } from '../../types/game'

interface GameCardProps {
    game: Game
}

export function GameCard({ game }: GameCardProps) {
    const [isHovered, setIsHovered] = useState(false)
    const [imageError, setImageError] = useState(false)
    const { openDetail, toggleFavorite } = useGameStore()

    const handlePlay = async (e: React.MouseEvent) => {
        e.stopPropagation()
        await window.api?.launchGame(game)
    }

    const handleInstall = async (e: React.MouseEvent) => {
        e.stopPropagation()
        if (game.steamAppId) {
            await window.api?.installSteamGame(game.steamAppId)
        }
    }

    const handleFavorite = (e: React.MouseEvent) => {
        e.stopPropagation()
        toggleFavorite(game.id)
    }

    return (
        <motion.div
            className="relative aspect-[3/4] rounded-lg overflow-hidden cursor-pointer group"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
            onClick={() => openDetail(game)}
            whileHover={{ scale: 1.03 }}
            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
        >
            {/* Cover Image */}
            <div className="absolute inset-0 bg-void-surface">
                {game.coverUrl && !imageError ? (
                    <img
                        src={game.coverUrl}
                        alt={game.title}
                        className={`
              w-full h-full object-cover 
              transition-all duration-500
              ${isHovered ? 'scale-110 brightness-110' : 'scale-100 brightness-100'}
              ${!game.isInstalled ? 'grayscale-[50%] opacity-60' : ''}
            `}
                        onError={() => setImageError(true)}
                    />
                ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-void-surface to-void-deep">
                        <span className="text-3xl font-etched text-crimson-900/50">
                            {game.title.charAt(0)}
                        </span>
                    </div>
                )}
            </div>

            {/* Crimson border glow on hover */}
            <motion.div
                className="absolute inset-0 rounded-lg pointer-events-none"
                initial={{ opacity: 0 }}
                animate={{
                    opacity: isHovered ? 1 : 0,
                    boxShadow: isHovered
                        ? 'inset 0 0 0 2px rgba(255, 58, 58, 0.6), 0 0 30px rgba(255, 58, 58, 0.3)'
                        : 'inset 0 0 0 1px rgba(255, 58, 58, 0), 0 0 0px rgba(255, 58, 58, 0)'
                }}
                transition={{ duration: 0.3 }}
            />

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent" />

            {/* Status badges */}
            <div className="absolute top-2 left-2 flex flex-col gap-1">
                {game.source === 'steam' && (
                    <div className="px-1.5 py-0.5 text-[10px] font-mono bg-void-pure/80 text-text-muted rounded border border-void-border">
                        STEAM
                    </div>
                )}
                {!game.isInstalled && (
                    <div className="px-1.5 py-0.5 text-[10px] font-mono bg-crimson-950/80 text-crimson-400 rounded border border-crimson-900/30">
                        NOT INSTALLED
                    </div>
                )}
            </div>

            {/* Favorite indicator */}
            {game.isFavorite && (
                <motion.div
                    className="absolute top-2 right-2"
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                >
                    <Star className="w-4 h-4 text-crimson-500 fill-crimson-500" />
                </motion.div>
            )}

            {/* Title & Actions */}
            <div className="absolute bottom-0 inset-x-0 p-3">
                <h3 className="text-sm font-medium text-text-primary truncate mb-2 group-hover:text-white transition-colors">
                    {game.title}
                </h3>

                {/* Action buttons - appear on hover */}
                <motion.div
                    className="flex items-center gap-2"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{
                        opacity: isHovered ? 1 : 0,
                        y: isHovered ? 0 : 10
                    }}
                    transition={{ duration: 0.2 }}
                >
                    {/* Play/Install Button */}
                    {game.isInstalled ? (
                        <motion.button
                            onClick={handlePlay}
                            className="
                                flex-1 flex items-center justify-center gap-1.5 py-1.5
                                bg-crimson-600 hover:bg-crimson-500 
                                text-white text-xs font-medium
                                rounded transition-colors
                            "
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Play className="w-3 h-3 fill-current" />
                            <span>Play</span>
                        </motion.button>
                    ) : game.source === 'steam' && game.steamAppId ? (
                        <motion.button
                            onClick={handleInstall}
                            className="
                                flex-1 flex items-center justify-center gap-1.5 py-1.5
                                bg-blue-600 hover:bg-blue-500 
                                text-white text-xs font-medium
                                rounded transition-colors
                            "
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                        >
                            <Download className="w-3 h-3" />
                            <span>Install</span>
                        </motion.button>
                    ) : (
                        <motion.button
                            onClick={handlePlay}
                            className="
                                flex-1 flex items-center justify-center gap-1.5 py-1.5
                                bg-void-surface/80 text-text-muted
                                text-xs font-medium rounded
                            "
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            disabled
                        >
                            <Play className="w-3 h-3" />
                            <span>Play</span>
                        </motion.button>
                    )}

                    {/* Favorite Button */}
                    <motion.button
                        onClick={handleFavorite}
                        className={`
              p-1.5 rounded transition-colors
              ${game.isFavorite
                                ? 'bg-crimson-600/30 text-crimson-400'
                                : 'bg-void-surface/80 text-text-muted hover:text-crimson-400'
                            }
            `}
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                    >
                        <Heart className={`w-3.5 h-3.5 ${game.isFavorite ? 'fill-current' : ''}`} />
                    </motion.button>
                </motion.div>
            </div>

            {/* Installed indicator - glowing dot */}
            {game.isInstalled && (
                <div className="absolute bottom-3 right-3">
                    <motion.div
                        className="w-2 h-2 bg-emerald-500 rounded-full"
                        animate={{
                            boxShadow: [
                                '0 0 4px rgba(16, 185, 129, 0.5)',
                                '0 0 8px rgba(16, 185, 129, 0.8)',
                                '0 0 4px rgba(16, 185, 129, 0.5)',
                            ],
                        }}
                        transition={{ duration: 2, repeat: Infinity }}
                    />
                </div>
            )}
        </motion.div>
    )
}
