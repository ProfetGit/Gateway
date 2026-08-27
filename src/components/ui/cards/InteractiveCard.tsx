import type { ReactNode } from 'react'
import { motion } from 'framer-motion'
import { CornerBrackets } from '@/components/ui/CornerBrackets'

// One hover feel for every card in the app. Values are the ones the Trending /
// Free to Keep cards already used, since those were the reference. Entrance and
// hover live on SEPARATE elements on purpose: sharing one element makes the
// entrance transition (with its stagger delay) the fallback for hover-exit, so
// cards take the better part of a second to drop back down.
const HOVER = { scale: 1.05, y: -8 }
const TAP = { scale: 0.97 }
const HOVER_TRANSITION = { duration: 0.1, ease: [0.16, 1, 0.3, 1] as const }
const ENTRANCE_TRANSITION = { duration: 0.5, ease: [0.16, 1, 0.3, 1] as const }

// Carousels slide in along their scroll axis, grids rise. Same curve either way.
const ENTRANCE_FROM = {
    right: { opacity: 0, x: 50, scale: 0.9 },
    bottom: { opacity: 0, y: 20, scale: 0.96 },
}

export interface InteractiveCardProps {
    children: ReactNode
    onClick?: (e: React.MouseEvent) => void
    onContextMenu?: (e: React.MouseEvent) => void
    /** Entrance delay in ms. `null` skips the entrance — recycled cards in a
     *  virtualized grid must not replay it on every scroll. */
    entranceDelayMs?: number | null
    entranceFrom?: keyof typeof ENTRANCE_FROM
    /** Corner brackets, or `false` for none. */
    brackets?: { colorClass: string; size?: number | string; thickness?: number | string; className?: string } | false
    /** e.g. '3 / 4'. Inline, not `aspect-[x/y]` — the Tailwind class doesn't hold
     *  height reliably inside a flex-column motion element. */
    aspectRatio?: string
    width?: number
    /** Classes for the card surface itself: background, border, hover colors. */
    className?: string
    wrapperClassName?: string
    /** Anchor for the hover scale. Defaults to the centre. A card in a clipping
     *  scroll container passes 'top center' so the scale grows downward only —
     *  otherwise half the growth goes up into the container's edge. */
    transformOrigin?: string
    ariaLabel?: string
}

// `@container` (container-type: inline-size) is load-bearing, not decoration:
// card contents size themselves in `cqw`, which measures THIS element. Plain
// percentages resolve against whatever the nearest containing block happens to
// be, so they break silently the moment a card gains a wrapper.
export function InteractiveCard({
    children,
    onClick,
    onContextMenu,
    entranceDelayMs = null,
    entranceFrom = 'bottom',
    brackets = false,
    aspectRatio,
    width,
    className = '',
    wrapperClassName = '',
    transformOrigin,
    ariaLabel,
}: InteractiveCardProps) {
    const animatesIn = entranceDelayMs !== null

    return (
        <motion.div
            initial={animatesIn ? ENTRANCE_FROM[entranceFrom] : false}
            animate={animatesIn ? { opacity: 1, x: 0, y: 0, scale: 1 } : undefined}
            transition={{ ...ENTRANCE_TRANSITION, delay: (entranceDelayMs ?? 0) / 1000 }}
            className={`relative z-0 hover:z-20 ${wrapperClassName}`}
        >
            {/* role=button rather than a real <button>: game cards nest their own
                buttons (favourite, play), and a button inside a button is invalid. */}
            <motion.div
                role="button"
                tabIndex={0}
                aria-label={ariaLabel}
                onClick={onClick}
                onContextMenu={onContextMenu}
                onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                        e.preventDefault()
                        onClick?.(e as unknown as React.MouseEvent)
                    }
                }}
                whileHover={HOVER}
                whileTap={TAP}
                transition={HOVER_TRANSITION}
                style={{ aspectRatio, width, transformOrigin }}
                className={`group @container relative w-full overflow-hidden cursor-pointer isolate text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-crimson-500/60 ${className}`}
            >
                {children}
                {/* After children, not before: the brackets are a plain absolute
                    layer, so a card whose content paints later (StoreCard's image
                    and gradients) hid them whenever no z-index was passed. */}
                {brackets && <CornerBrackets className="z-30" {...brackets} />}
            </motion.div>
        </motion.div>
    )
}
