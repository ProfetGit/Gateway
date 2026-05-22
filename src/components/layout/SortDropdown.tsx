import { motion, AnimatePresence } from 'framer-motion'
import { ChevronDown, Check } from 'lucide-react'
import { useState, useRef, useEffect } from 'react'
import type { SortOption } from '../../types/game'

interface SortDropdownProps {
    currentSort: SortOption
    onSort: (sort: SortOption) => void
}

const options: { id: SortOption; label: string }[] = [
    { id: 'alphabetical', label: 'Alphabetical' },
    { id: 'playtime', label: 'Hours Played' },
    { id: 'lastPlayed', label: 'Last Played' },
]

export function SortDropdown({ currentSort, onSort }: SortDropdownProps) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    useEffect(() => {
        const handleClickOutside = (event: MouseEvent) => {
            if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
                setIsOpen(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    return (
        <div className="relative" ref={containerRef}>
            <button
                onClick={() => setIsOpen(!isOpen)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-display font-bold italic tracking-wider uppercase text-white/40 hover:text-white transition-colors"
            >
                <span>SORT: <span className="text-white">{options.find(o => o.id === currentSort)?.label}</span></span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-56 bg-void-surface border border-white/10 shadow-xl z-50 flex flex-col py-2"
                    >
                        {options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => {
                                    onSort(option.id)
                                    setIsOpen(false)
                                }}
                                className="flex items-center justify-between px-4 py-3 text-left text-xs font-mono font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                {option.label}
                                {currentSort === option.id && <Check className="w-3 h-3 text-crimson-500" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
