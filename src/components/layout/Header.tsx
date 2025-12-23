import { motion, AnimatePresence } from 'framer-motion'
import { Search, Plus, X, Star, ChevronDown, Check, Monitor } from 'lucide-react'
import { useGameStore, useFilteredGames } from '../../stores/gameStore'
import clsx from 'clsx'
import type { FilterStatus, SortOption, FilterPlatform } from '../../types/game'
import { useState, useRef, useEffect } from 'react'

export function Header() {
    const {
        filters,
        setFilterStatus,
        setFilterPlatform,
        toggleOnlyFavorites,
        setSearchQuery,
        setSort,
        openAddModal
    } = useGameStore()

    // We use the filtered list length for the count
    const filteredGames = useFilteredGames()
    const gameCount = filteredGames.length

    const tabs: { id: FilterStatus; label: string }[] = [
        { id: 'all', label: 'ALL' },
        { id: 'installed', label: 'INSTALLED' },
    ]

    return (
        <header className="h-28 flex flex-col justify-end px-10 pb-4 shrink-0 relative z-40 bg-gradient-to-b from-void-pure to-transparent select-none">
            <div className="flex items-end justify-between">

                {/* Left: Filter Tabs & Status */}
                <div className="flex flex-col gap-4">
                    {/* Status Display */}
                    <div className="flex items-center gap-3 text-xs font-mono tracking-[0.2em] text-white/30 uppercase pl-1">
                        <span className="w-1.5 h-1.5 bg-crimson-500 rounded-full animate-pulse" />
                        <span>STATUS: {gameCount} {gameCount === 1 ? 'GAME' : 'GAMES'}</span>
                    </div>

                    {/* Filter Tabs */}
                    <div className="flex items-center gap-1">
                        {tabs.map((tab) => {
                            const isActive = filters.status === tab.id
                            return (
                                <button
                                    key={tab.id}
                                    onClick={() => setFilterStatus(tab.id)}
                                    className={clsx(
                                        "relative px-6 py-2 text-sm font-display font-bold italic tracking-wider transition-all duration-300 uppercase clip-path-slant",
                                        isActive ? "text-void-pure bg-white" : "text-white/40 hover:text-white bg-white/5 hover:bg-white/10"
                                    )}
                                    style={{ clipPath: 'polygon(10% 0, 100% 0, 90% 100%, 0% 100%)' }}
                                >
                                    {tab.label}
                                </button>
                            )
                        })}

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10 mx-4 rotate-12" />

                        {/* Favorites Toggle */}
                        <button
                            onClick={toggleOnlyFavorites}
                            className={clsx(
                                "flex items-center gap-2 px-4 py-2 text-sm font-display font-bold italic tracking-wider transition-all duration-300 uppercase",
                                filters.onlyFavorites ? "text-ember-400" : "text-white/40 hover:text-white"
                            )}
                        >
                            <Star className={clsx("w-4 h-4", filters.onlyFavorites && "fill-current")} />
                            <span>FAVORITES</span>
                        </button>

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10 mx-4 rotate-12" />

                        <SortDropdown
                            currentSort={filters.sortBy}
                            onSort={(sort) => {
                                // Smart defaults: Alphabetical is ASC, others are usually DESC (High > Low)
                                const direction = sort === 'alphabetical' ? 'asc' : 'desc'
                                setSort(sort, direction)
                            }}
                        />

                        {/* Divider */}
                        <div className="w-px h-6 bg-white/10 mx-4 rotate-12" />

                        {/* Platform Filter */}
                        <PlatformDropdown
                            currentPlatform={filters.platform}
                            onPlatformChange={setFilterPlatform}
                        />
                    </div>
                </div>

                {/* Right: Search & Actions */}
                <div className="flex items-end gap-8 mb-1">
                    {/* Search - Terminal Style */}
                    <div className="relative group/search w-72">
                        <div className="absolute inset-x-0 bottom-0 h-px bg-white/20 group-focus-within/search:bg-crimson-500 transition-colors duration-300" />
                        <Search className="absolute left-0 bottom-3 w-4 h-4 text-white/40 group-focus-within/search:text-crimson-500 transition-colors" />
                        <input
                            type="text"
                            placeholder="SEARCH..."
                            value={filters.search}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            className="w-full pl-8 pr-10 py-2 bg-transparent border-none outline-none text-lg font-display font-bold italic tracking-wider text-white placeholder:text-white/20 uppercase focus:outline-none focus:ring-0 focus:border-none"
                            style={{ outline: 'none', boxShadow: 'none' }}
                        />
                        {/* Blinking Cursor Decoration (only when empty) */}
                        {!filters.search && (
                            <div className="absolute right-0 bottom-3 w-2 h-4 bg-crimson-500 animate-pulse pointer-events-none opacity-50" />
                        )}
                        {filters.search && (
                            <button
                                onClick={() => setSearchQuery('')}
                                className="absolute right-2 bottom-3 text-white/40 hover:text-white transition-colors"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        )}
                    </div>

                    {/* Add Game Button */}
                    <motion.button
                        onClick={openAddModal}
                        className="
                relative group flex items-center justify-center w-12 h-12
                border border-white/20 hover:border-crimson-500/50 bg-white/5 hover:bg-crimson-500/10
                transition-all duration-300 skew-x-[-10deg]
              "
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        title="ADD GAME"
                    >
                        <Plus className="w-6 h-6 text-white/60 group-hover:text-crimson-500 transition-colors bg-transparent skew-x-[10deg]" />
                    </motion.button>
                </div>
            </div>
        </header>
    )
}

function SortDropdown({ currentSort, onSort }: { currentSort: SortOption, onSort: (sort: SortOption) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const options: { id: SortOption; label: string }[] = [
        { id: 'alphabetical', label: 'Alphabetical' },
        { id: 'playtime', label: 'Hours Played' },
        { id: 'lastPlayed', label: 'Last Played' },
    ]

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

function PlatformDropdown({ currentPlatform, onPlatformChange }: { currentPlatform: FilterPlatform, onPlatformChange: (platform: FilterPlatform) => void }) {
    const [isOpen, setIsOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)

    const options: { id: FilterPlatform; label: string }[] = [
        { id: 'all', label: 'All Platforms' },
        { id: 'steam', label: 'Steam' },
        { id: 'lutris', label: 'Lutris' },
    ]

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
                <Monitor className="w-4 h-4" />
                <span><span className="text-white">{options.find(o => o.id === currentPlatform)?.label}</span></span>
                <ChevronDown className={`w-4 h-4 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} />
            </button>

            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ opacity: 0, y: -10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        transition={{ duration: 0.15 }}
                        className="absolute top-full left-0 mt-2 w-48 bg-void-surface border border-white/10 shadow-xl z-50 flex flex-col py-2"
                    >
                        {options.map((option) => (
                            <button
                                key={option.id}
                                onClick={() => {
                                    onPlatformChange(option.id)
                                    setIsOpen(false)
                                }}
                                className="flex items-center justify-between px-4 py-3 text-left text-xs font-mono font-bold uppercase tracking-wider text-white/60 hover:text-white hover:bg-white/5 transition-colors"
                            >
                                {option.label}
                                {currentPlatform === option.id && <Check className="w-3 h-3 text-crimson-500" />}
                            </button>
                        ))}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
