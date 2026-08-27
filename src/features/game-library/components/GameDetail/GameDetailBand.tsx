import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { bandVariants } from './game-detail-animations'

/**
 * One horizontal division of the panel. Bands carry no background and no border
 * box — only a hairline above them — so the panel reads as a single surface
 * with divisions rather than a tray of floating cards.
 */
export function GameDetailBand({
    index, title, aside, className = '', compact = false, children,
}: {
    index: number
    title?: string
    aside?: ReactNode
    className?: string
    compact?: boolean
    children: ReactNode
}) {
    return (
        <motion.section
            variants={bandVariants(index)}
            className={`${compact ? 'py-3' : 'py-5'} border-t border-void-border/45 first:border-t-0 ${
                compact ? 'first:pt-4' : 'first:pt-6'
            } ${className}`}
        >
            {(title || aside) && (
                <div className={`flex items-baseline justify-between gap-3 ${compact ? 'mb-2' : 'mb-3'}`}>
                    {title && (
                        <h3 className="text-[9.5px] font-mono font-bold uppercase tracking-[0.2em] text-crimson-400">
                            {title}
                        </h3>
                    )}
                    {aside}
                </div>
            )}
            {children}
        </motion.section>
    )
}

export function SkeletonLines({ count, className = '' }: { count: number; className?: string }) {
    return (
        <div className={`space-y-2 ${className}`}>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="h-3 skeleton-block"
                    style={{ width: i === count - 1 ? '62%' : '100%' }}
                />
            ))}
        </div>
    )
}
