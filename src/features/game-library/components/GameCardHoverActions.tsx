import { Download, Play } from 'lucide-react'
import { cardStripHeight } from '@/components/ui/cards/card-motion'

export type GameCardHoverActionsProps = {
    isInstalled: boolean
    onClick: (e: React.MouseEvent) => void
}

// The crimson fill and the white copy of the label are clipped by the SAME
// inset() on the SAME curve, so each letter turns white exactly as the fill
// edge passes under it. Transitioning the label's `color` instead made the
// whole word change at once, ahead of the fill it was supposed to react to.
const WIPE = 'transition-[clip-path] duration-100 ease-out-expo group-hover/strip:duration-[220ms]'
const CLIPPED = '[clip-path:inset(0_100%_0_0)] group-hover/strip:[clip-path:inset(0_0_0_0)]'

function Label({ isInstalled, className }: { isInstalled: boolean; className: string }) {
    return (
        <span
            className={`absolute inset-0 flex items-center justify-center gap-[0.6em] font-mono font-bold uppercase tracking-[0.2em] ${className}`}
            style={{
                fontSize: 'clamp(8px, 3.2cqw, 14px)',
                // Pinned to grayscale AA. The strip is transform-animated, so the
                // browser promotes it to its own layer for the duration and drops
                // back afterwards — subpixel-antialiased text visibly re-renders at
                // both ends of that, which reads as a snap.
                WebkitFontSmoothing: 'antialiased',
                transform: 'translateZ(0)',
            }}
        >
            {isInstalled ? (
                <Play className="w-[1.2em] h-[1.2em] fill-current" />
            ) : (
                <Download className="w-[1.2em] h-[1.2em]" />
            )}
            {isInstalled ? 'Launch' : 'Install'}
        </span>
    )
}

// Full-bleed strip that slides up from the bottom edge on card hover. It sits
// UNDER the corner brackets (z-20 vs the brackets' z-40) on purpose: the leg
// draws across the strip, then disappears into the crimson fill when the strip
// itself is hovered, since bracket and fill are a shade apart.
export function GameCardHoverActions({ isInstalled, onClick }: GameCardHoverActionsProps) {
    return (
        <button
            onClick={onClick}
            aria-label={isInstalled ? 'Launch' : 'Install'}
            style={{ height: cardStripHeight }}
            className="group/strip absolute inset-x-0 bottom-0 z-20 overflow-hidden cursor-pointer bg-void-pure/90 border-t border-crimson-500/45 translate-y-full group-hover:translate-y-0 transition-transform duration-100 ease-out-expo group-hover:duration-200 focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-crimson-400"
        >
            <span className={`absolute inset-0 bg-crimson-600 ${CLIPPED} ${WIPE}`} />

            {/* Label lands after the strip has settled — animating text and
                surface at once is what made it look unsteady. */}
            <span className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-100 ease-out-expo group-hover:duration-150 group-hover:delay-[130ms]">
                <Label isInstalled={isInstalled} className="text-crimson-300" />
                <span aria-hidden className={`absolute inset-0 ${CLIPPED} ${WIPE}`}>
                    <Label isInstalled={isInstalled} className="text-white" />
                </span>
            </span>
        </button>
    )
}
