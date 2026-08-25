import { ChevronLeft, ChevronRight } from 'lucide-react'
import { motion } from 'framer-motion'

type AccentHue = 'amber' | 'emerald' | 'crimson'

interface CarouselNavProps {
    canScrollLeft: boolean
    canScrollRight: boolean
    onScrollLeft: () => void
    onScrollRight: () => void
    accent?: AccentHue
}

const accentClasses: Record<AccentHue, { text: string; border: string; hoverBg: string; hoverBorder: string; glow: string }> = {
    amber: {
        text: 'text-amber-500/70',
        border: 'border-amber-900/40',
        hoverBg: 'hover:bg-amber-500/10',
        hoverBorder: 'hover:border-amber-500/60',
        glow: 'hover:shadow-[0_0_16px_oklch(0.78_0.17_75/0.25)]',
    },
    emerald: {
        text: 'text-emerald-400/70',
        border: 'border-emerald-900/40',
        hoverBg: 'hover:bg-emerald-500/10',
        hoverBorder: 'hover:border-emerald-500/60',
        glow: 'hover:shadow-[0_0_16px_oklch(0.72_0.17_165/0.25)]',
    },
    crimson: {
        text: 'text-crimson-500/70',
        border: 'border-crimson-900/40',
        hoverBg: 'hover:bg-crimson-500/10',
        hoverBorder: 'hover:border-crimson-500/60',
        glow: 'hover:shadow-[0_0_16px_oklch(0.52_0.23_25/0.25)]',
    },
}

export function CarouselNav({ canScrollLeft, canScrollRight, onScrollLeft, onScrollRight, accent = 'amber' }: CarouselNavProps) {
    const c = accentClasses[accent]

    return (
        <div className="flex items-center gap-1.5 shrink-0">
            <NavButton
                onClick={onScrollLeft}
                disabled={!canScrollLeft}
                accent={c}
                label="Scroll left"
            >
                <ChevronLeft className="w-4 h-4" strokeWidth={2.5} />
            </NavButton>
            <NavButton
                onClick={onScrollRight}
                disabled={!canScrollRight}
                accent={c}
                label="Scroll right"
            >
                <ChevronRight className="w-4 h-4" strokeWidth={2.5} />
            </NavButton>
        </div>
    )
}

interface NavButtonProps {
    onClick: () => void
    disabled: boolean
    accent: typeof accentClasses[AccentHue]
    label: string
    children: React.ReactNode
}

function NavButton({ onClick, disabled, accent, label, children }: NavButtonProps) {
    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            aria-label={label}
            whileTap={disabled ? undefined : { scale: 0.9 }}
            transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
            className={`
                relative flex items-center justify-center w-9 h-9 rounded-sm
                bg-void-surface/40 border ${accent.border} ${accent.text}
                ${disabled
                    ? 'opacity-25 cursor-not-allowed'
                    : `${accent.hoverBg} ${accent.hoverBorder} ${accent.glow} hover:text-white cursor-pointer`
                }
                transition-[background-color,border-color,box-shadow,color,opacity,transform] duration-200 ease-out
                focus:outline-none focus-visible:ring-1 focus-visible:ring-current
            `}
        >
            {/* Corner tick marks for signature angular feel */}
            <span className="absolute top-0 left-0 w-1.5 h-1.5 border-t border-l border-current opacity-40 pointer-events-none" />
            <span className="absolute bottom-0 right-0 w-1.5 h-1.5 border-b border-r border-current opacity-40 pointer-events-none" />
            {children}
        </motion.button>
    )
}
