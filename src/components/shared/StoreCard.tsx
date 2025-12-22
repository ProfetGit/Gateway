import React from 'react'
import { motion } from 'framer-motion'

export interface StoreCardProps {
    title: string
    image: string
    index: number
    onClick: () => void
    // Styling options
    accentColor?: 'amber' | 'emerald' | 'crimson'
    // Badges
    topLeftBadge?: React.ReactNode
    topRightBadge?: React.ReactNode
    // Bottom content
    bottomLeft?: React.ReactNode
    bottomRight?: React.ReactNode
    // Card size
    width?: number
    // Claimed state (for free games)
    isClaimed?: boolean
}

const accentColors = {
    amber: {
        border: 'hover:border-amber-500/50',
        shadow: 'hover:shadow-[0_8px_30px_rgba(245,158,11,0.3)]',
        corners: 'group-hover:border-amber-400',
        text: 'group-hover:text-amber-200',
        glow: 'from-amber-500/10',
    },
    emerald: {
        border: 'hover:border-emerald-500/50',
        shadow: 'hover:shadow-[0_8px_30px_rgba(16,185,129,0.3)]',
        corners: 'group-hover:border-emerald-400',
        text: 'group-hover:text-emerald-200',
        glow: 'from-emerald-500/10',
    },
    crimson: {
        border: 'hover:border-crimson-500/50',
        shadow: 'hover:shadow-[0_8px_30px_rgba(220,38,38,0.3)]',
        corners: 'group-hover:border-crimson-400',
        text: 'group-hover:text-crimson-200',
        glow: 'from-crimson-500/10',
    },
}

export function StoreCard({
    title,
    image,
    index,
    onClick,
    accentColor = 'amber',
    topLeftBadge,
    topRightBadge,
    bottomLeft,
    bottomRight,
    width = 280,
    isClaimed = false,
}: StoreCardProps) {
    const [imageError, setImageError] = React.useState(false)
    const colors = accentColors[accentColor]

    return (
        <motion.div
            initial={{ opacity: 0, x: 50, scale: 0.9 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            transition={{
                delay: index * 0.08,
                duration: 0.5,
                ease: [0.16, 1, 0.3, 1]
            }}
            className="flex-shrink-0 snap-start relative z-0 hover:z-20"
        >
            <motion.button
                onClick={onClick}
                whileHover={{ scale: 1.05, y: -8 }}
                whileTap={{ scale: 0.97 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                className={`group relative rounded-lg overflow-hidden bg-void-surface border border-void-border/30 shadow-lg focus:outline-none ${colors.border} ${colors.shadow} ${isClaimed ? 'ring-1 ring-emerald-500/40' : ''}`}
                style={{ width, aspectRatio: '460 / 215' }}
            >
                {/* Image */}
                {!imageError ? (
                    <img
                        src={image}
                        alt={title}
                        onError={() => setImageError(true)}
                        className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 ease-out group-hover:scale-110"
                    />
                ) : (
                    <div className="absolute inset-0 bg-gradient-to-br from-void-surface to-void-elevated flex items-center justify-center">
                        <span className="text-text-muted text-sm font-mono">{title.slice(0, 2)}</span>
                    </div>
                )}

                {/* Gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-300" />

                {/* Corner accents on hover */}
                <div className={`absolute top-0 left-0 w-0 h-0 border-t-[3px] border-l-[3px] border-transparent group-hover:w-8 group-hover:h-8 ${colors.corners} transition-all duration-300`} />
                <div className={`absolute bottom-0 right-0 w-0 h-0 border-b-[3px] border-r-[3px] border-transparent group-hover:w-8 group-hover:h-8 ${colors.corners} transition-all duration-300`} />

                {/* Scanlines */}
                <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,rgba(0,0,0,0.03)_3px)] pointer-events-none opacity-50" />

                {/* Top Left Badge */}
                {topLeftBadge && (
                    <div className="absolute top-3 left-3">
                        {topLeftBadge}
                    </div>
                )}

                {/* Top Right Badge */}
                {topRightBadge && (
                    <motion.div
                        initial={{ scale: 0, rotate: -10 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: index * 0.08 + 0.2, type: 'spring', stiffness: 400 }}
                        className="absolute top-3 right-3"
                    >
                        {topRightBadge}
                    </motion.div>
                )}

                {/* Content */}
                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <h3 className={`text-white text-sm font-bold truncate mb-2 ${colors.text} transition-colors`}>
                        {title}
                    </h3>

                    <div className="flex items-center justify-between">
                        {bottomLeft}
                        {bottomRight && (
                            <span className="opacity-0 group-hover:opacity-100 transition-opacity">
                                {bottomRight}
                            </span>
                        )}
                    </div>
                </div>

                {/* Hover glow effect */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-t ${colors.glow} via-transparent to-transparent`} />
            </motion.button>
        </motion.div>
    )
}

