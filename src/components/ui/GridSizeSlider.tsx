import { motion, AnimatePresence } from 'framer-motion'
import { useState } from 'react'
import { useUIStore } from '@/stores/ui-store'
import clsx from 'clsx'

const GRID_PRESETS = [120, 150, 180, 220, 280]

export function GridSizeSlider() {
    const gridSize = useUIStore((s) => s.gridSize)
    const setGridSize = useUIStore((s) => s.setGridSize)
    const [hovered, setHovered] = useState(false)

    const activeIndex = (() => {
        const exact = GRID_PRESETS.indexOf(gridSize)
        if (exact >= 0) return exact
        let closest = 0
        let minDist = Infinity
        GRID_PRESETS.forEach((p, i) => {
            const d = Math.abs(p - gridSize)
            if (d < minDist) { minDist = d; closest = i }
        })
        return closest
    })()

    const fillPct = (activeIndex / (GRID_PRESETS.length - 1)) * 100

    return (
        <div
            className="relative flex items-center gap-2.5 px-3 py-2"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}
        >
            {/* Corner brackets */}
            <AnimatePresence>
                {hovered && (
                    <>
                        <motion.span
                            key="tl"
                            initial={{ opacity: 0, x: 3, y: 3 }}
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, x: 3, y: 3 }}
                            transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-none absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20"
                        />
                        <motion.span
                            key="br"
                            initial={{ opacity: 0, x: -3, y: -3 }}
                            animate={{ opacity: 1, x: 0, y: 0 }}
                            exit={{ opacity: 0, x: -3, y: -3 }}
                            transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-none absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20"
                        />
                        <motion.span
                            key="label"
                            initial={{ opacity: 0, y: 3 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: 3 }}
                            transition={{ duration: 0.1 }}
                            className="pointer-events-none absolute -top-3.5 left-0 right-0 text-center text-[8px] font-mono tracking-[0.25em] text-white/25 uppercase"
                        >
                            Grid
                        </motion.span>
                    </>
                )}
            </AnimatePresence>

            {/* Small grid icon */}
            <svg
                className={clsx(
                    "w-3 h-3 shrink-0 transition-colors duration-100",
                    hovered ? "text-white/35" : "text-white/15"
                )}
                viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
            >
                <rect x="1" y="1" width="4" height="4" />
                <rect x="7" y="1" width="4" height="4" />
                <rect x="1" y="7" width="4" height="4" />
                <rect x="7" y="7" width="4" height="4" />
            </svg>

            {/* Tick track */}
            <div className="relative flex items-center" style={{ width: 72 }}>
                {/* Base track */}
                <div className="absolute inset-0 top-1/2 -translate-y-1/2 h-px bg-void-border" />
                {/* Fill track */}
                <motion.div
                    className="absolute left-0 top-1/2 -translate-y-1/2 h-px bg-crimson-900/70"
                    animate={{ width: `${fillPct}%` }}
                    transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
                />

                {/* Ticks */}
                <div className="relative z-10 flex items-center justify-between w-full">
                    {GRID_PRESETS.map((size, i) => {
                        const isActive = i === activeIndex
                        const isFilled = i <= activeIndex
                        return (
                            <button
                                key={size}
                                onClick={() => setGridSize(size)}
                                className="relative flex items-center justify-center w-4 h-4 group/tick"
                                title={`${size}px`}
                            >
                                <motion.div
                                    className={clsx(
                                        "rotate-45 transition-colors duration-100",
                                        isActive
                                            ? "bg-crimson-500 w-2 h-2"
                                            : isFilled
                                            ? "bg-crimson-900 w-1.5 h-1.5 group-hover/tick:bg-crimson-700"
                                            : "bg-void-border w-1.5 h-1.5 group-hover/tick:bg-white/30"
                                    )}
                                    animate={
                                        isActive
                                            ? { boxShadow: '0 0 8px oklch(0.58 0.245 25 / 0.5), 0 0 16px oklch(0.58 0.245 25 / 0.2)' }
                                            : { boxShadow: 'none' }
                                    }
                                    transition={{ duration: 0.15 }}
                                />
                            </button>
                        )
                    })}
                </div>
            </div>

            {/* Large grid icon */}
            <svg
                className={clsx(
                    "w-4 h-4 shrink-0 transition-colors duration-100",
                    hovered ? "text-white/35" : "text-white/15"
                )}
                viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="1.5"
            >
                <rect x="0.75" y="0.75" width="4.5" height="4.5" />
                <rect x="6.75" y="0.75" width="4.5" height="4.5" />
                <rect x="0.75" y="6.75" width="4.5" height="4.5" />
                <rect x="6.75" y="6.75" width="4.5" height="4.5" />
            </svg>
        </div>
    )
}
