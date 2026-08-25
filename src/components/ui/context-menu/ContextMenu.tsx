import { useEffect, useRef, useState, useLayoutEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useContextMenuStore } from './context-menu-store'

/**
 * CONTEXT MENU DESIGN PRINCIPLES
 * ══════════════════════════════════════════════════════════════
 * 1. SMART POSITIONING — Auto-flip/shift to stay in viewport
 * 2. CRIMSON AESTHETIC — Glassmorphism + Noise + Red accents
 * 3. KEYBOARD NAV — Arrow keys + Enter support
 * 4. AUTO DISMISS — On scroll, resize, blur, click outside
 * ══════════════════════════════════════════════════════════════
 */
export function ContextMenu() {
    const { isOpen, x, y, items, close } = useContextMenuStore()
    const menuRef = useRef<HTMLDivElement>(null)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [menuPosition, setMenuPosition] = useState({ x, y })
    const activeIndexRef = useRef(activeIndex)

    // Keep ref in sync
    useEffect(() => {
        activeIndexRef.current = activeIndex
    }, [activeIndex])

    // Reset state when menu opens
    useEffect(() => {
        if (isOpen) {
            setActiveIndex(-1)
            setMenuPosition({ x, y })
        }
    }, [isOpen, x, y])

    // Handle interactions (Keyboard, Scroll, Resize, Click Outside)
    useEffect(() => {
        if (!isOpen) return

        const handleClickOutside = (e: MouseEvent) => {
            if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
                close()
            }
        }

        const handleKeyDown = (e: KeyboardEvent) => {
            e.stopPropagation() // Prevent game/app shortcuts while menu is open

            if (e.key === 'Escape') {
                close()
            } else if (e.key === 'ArrowDown') {
                e.preventDefault()
                setActiveIndex(prev => (prev + 1) % items.length)
            } else if (e.key === 'ArrowUp') {
                e.preventDefault()
                setActiveIndex(prev => (prev - 1 + items.length) % items.length)
            } else if (e.key === 'Enter') {
                e.preventDefault()
                const currentIndex = activeIndexRef.current
                if (currentIndex >= 0 && items[currentIndex]) {
                    items[currentIndex].onClick()
                    close()
                }
            }
        }

        const handleDismiss = () => close()

        window.addEventListener('mousedown', handleClickOutside)
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('scroll', handleDismiss, { capture: true })
        window.addEventListener('resize', handleDismiss)
        window.addEventListener('blur', handleDismiss)

        return () => {
            window.removeEventListener('mousedown', handleClickOutside)
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('scroll', handleDismiss, { capture: true })
            window.removeEventListener('resize', handleDismiss)
            window.removeEventListener('blur', handleDismiss)
        }
    }, [isOpen, items, activeIndex, close])

    // Smart Positioning (Collision Detection)
    useLayoutEffect(() => {
        if (isOpen && menuRef.current) {
            const rect = menuRef.current.getBoundingClientRect()
            const { innerWidth, innerHeight } = window

            let newX = x
            let newY = y

            // Horizontal collision (Right edge)
            if (x + rect.width > innerWidth) {
                newX = x - rect.width
            }

            // Vertical collision (Bottom edge)
            if (y + rect.height > innerHeight) {
                newY = y - rect.height
            }

            // Safety clamp
            newX = Math.max(10, Math.min(newX, innerWidth - rect.width - 10))
            newY = Math.max(10, Math.min(newY, innerHeight - rect.height - 10))

            setMenuPosition({ x: newX, y: newY })
        }
    }, [isOpen, x, y])

    return (
        <AnimatePresence>
            {isOpen && (
                <div className="fixed inset-0 z-[1000] pointer-events-none">
                    <motion.div
                        ref={menuRef}
                        initial={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
                        animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                        exit={{ opacity: 0, scale: 0.95, filter: 'blur(8px)' }}
                        transition={{
                            type: 'spring',
                            damping: 20,
                            stiffness: 300,
                            mass: 0.8
                        }}
                        className="absolute pointer-events-auto min-w-[220px] bg-void-elevated/95 backdrop-blur-2xl border border-white/10 rounded-xl shadow-[0_20px_50px_-10px_oklch(0_0_0/0.8)] overflow-hidden"
                        style={{ top: menuPosition.y, left: menuPosition.x }}
                    >
                        {/* Noise overlay for texture */}
                        <div
                            className="absolute inset-0 opacity-[0.04] pointer-events-none mix-blend-overlay"
                            style={{
                                backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.85' numOctaves='3' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`
                            }}
                        />

                        {/* Crimson gradient accent */}
                        <div className="absolute top-0 right-0 w-32 h-32 bg-crimson-500/10 blur-[50px] pointer-events-none" />

                        <div className="relative p-1.5 flex flex-col gap-0.5" role="menu">
                            {items.map((item, index) => (
                                <button
                                    key={index}
                                    role="menuitem"
                                    onMouseEnter={() => setActiveIndex(index)}
                                    onClick={(e) => {
                                        e.stopPropagation()
                                        item.onClick()
                                        close()
                                    }}
                                    className={`
                                        relative group flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-left transition-all duration-200 outline-none
                                        ${(index === activeIndex)
                                            ? item.danger
                                                ? 'bg-red-500/10 text-red-200 shadow-[inset_0_0_0_1px_oklch(0.64_0.215_25/0.2)]'
                                                : 'bg-white/10 text-white shadow-[inset_0_0_0_1px_oklch(0.98_0.003_25/0.1)]'
                                            : item.danger
                                                ? 'text-red-400 opacity-80'
                                                : 'text-gray-400'
                                        }
                                    `}
                                >
                                    {/* Icon */}
                                    {item.icon && (
                                        <span className={`w-4 h-4 transition-all duration-200 ${index === activeIndex ? 'opacity-100 scale-110' : 'opacity-60'
                                            }`}>
                                            {item.icon}
                                        </span>
                                    )}

                                    {/* Label */}
                                    <span className="flex-1">{item.label}</span>

                                    {/* Active subtle shimmer/glow */}
                                    {index === activeIndex && !item.danger && (
                                        <div className="absolute left-0 w-0.5 h-4 bg-crimson-500 rounded-r-full shadow-[0_0_8px_oklch(0.52_0.23_25/0.8)]" />
                                    )}
                                </button>
                            ))}
                        </div>
                    </motion.div>
                </div>
            )}
        </AnimatePresence>
    )
}
