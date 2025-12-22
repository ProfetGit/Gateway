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
    // Price/info content (appears bottom-right)
    bottomLeft?: React.ReactNode
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

                {/* Free Game States - Shimmer for unclaimed, Static glow for claimed */}
                {accentColor === 'emerald' && !isClaimed && (
                    /* Animated shimmer sweep for claimable free games */
                    <div className="absolute inset-0 overflow-hidden pointer-events-none">
                        <div
                            className="absolute inset-0 -translate-x-full animate-[shimmer_2.5s_ease-in-out_infinite]"
                            style={{
                                background: 'linear-gradient(90deg, transparent 0%, rgba(16,185,129,0.15) 50%, transparent 100%)',
                            }}
                        />
                    </div>
                )}

                {isClaimed && (
                    /* Static emerald glow for claimed games - no animation */
                    <>
                        {/* Top edge glow */}
                        <div
                            className="absolute top-0 left-0 right-0 h-16 pointer-events-none"
                            style={{
                                background: 'linear-gradient(180deg, rgba(16,185,129,0.25) 0%, transparent 100%)',
                            }}
                        />
                        {/* Corner accent glow */}
                        <div
                            className="absolute top-0 left-0 w-24 h-24 pointer-events-none"
                            style={{
                                background: 'radial-gradient(circle at top left, rgba(16,185,129,0.3) 0%, transparent 70%)',
                            }}
                        />
                        {/* Subtle border enhancement */}
                        <div className="absolute inset-0 rounded-lg ring-1 ring-inset ring-emerald-400/30 pointer-events-none" />
                    </>
                )}

                {/* Top Left Badge */}
                {topLeftBadge && (
                    <div className="absolute top-3 left-3">
                        {topLeftBadge}
                    </div>
                )}

                {/* Top Right Badge */}
                {topRightBadge && (
                    <motion.div
                        initial={{ scale: 0, rotate: -5 }}
                        animate={{ scale: 1, rotate: 0 }}
                        transition={{ delay: index * 0.08 + 0.2, type: 'spring', stiffness: 200, damping: 20 }}
                        className="absolute top-3 right-3"
                    >
                        {topRightBadge}
                    </motion.div>
                )}

                {/* Content - Bottom corners layout */}
                <div className="absolute bottom-0 left-0 right-0 pb-3 pl-3 pointer-events-none">
                    {/* Title - Bottom Left */}
                    <h3
                        className={`text-white text-sm font-bold leading-snug max-w-[65%] text-left ${colors.text} transition-colors`}
                        style={{
                            textShadow: '0 2px 12px rgba(0,0,0,1), 0 1px 4px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.8)',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                            overflow: 'hidden'
                        }}
                    >
                        {title}
                    </h3>
                </div>

                {/* Price - Bottom Right */}
                {bottomLeft && (
                    <div
                        className="absolute bottom-3 right-3 pointer-events-none"
                        style={{ textShadow: '0 2px 8px rgba(0,0,0,0.9)' }}
                    >
                        {bottomLeft}
                    </div>
                )}

                {/* Hover glow effect */}
                <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-t ${colors.glow} via-transparent to-transparent`} />
            </motion.button>
        </motion.div>
    )
}

