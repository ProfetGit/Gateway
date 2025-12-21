import { motion } from 'framer-motion'
import { Search, Plus, X } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'

export function Header() {
    const { searchQuery, setSearchQuery, openAddModal, games, filter } = useGameStore()

    // Count games for current filter
    const gameCount = games.filter(g => {
        switch (filter) {
            case 'installed': return g.isInstalled
            case 'favorites': return g.isFavorite
            case 'steam': return g.source === 'steam'
            case 'not-installed': return !g.isInstalled && g.source === 'steam'
            default: return true
        }
    }).length

    const filterLabel: Record<string, string> = {
        all: 'Library',
        installed: 'Installed',
        favorites: 'Favorites',
        steam: 'Steam',
        'not-installed': 'Not Installed',
    }

    return (
    return (
        <header className="h-24 flex items-center justify-between px-10 shrink-0 relative z-40 bg-gradient-to-b from-void-pure to-transparent">
            {/* Title & Count */}
            <div className="flex flex-col gap-1 select-none">
                <div className="flex items-center gap-3">
                    <h1 className="text-4xl font-display font-black text-white italic tracking-tighter uppercase transform -skew-x-3 drop-shadow-2xl">
                        {filterLabel[filter]}
                    </h1>
                    <div className="h-px w-12 bg-crimson-500/50 mt-2" />
                </div>
                <div className="flex items-center gap-2 text-xs font-mono tracking-[0.2em] text-white/30 uppercase pl-1">
                    <span className="w-1.5 h-1.5 bg-crimson-500 rounded-full" />
                    <span>STATUS: {gameCount} {gameCount === 1 ? 'UNIT' : 'UNITS'} DEPLOYED</span>
                </div>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-6">
                {/* Search - Terminal Style */}
                <div className="relative group/search">
                    <div className="absolute inset-x-0 bottom-0 h-px bg-white/20 group-focus-within/search:bg-crimson-500 transition-colors duration-300" />
                    <Search className="absolute left-0 bottom-3 w-4 h-4 text-white/40 group-focus-within/search:text-crimson-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="SEARCH_DB..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="
              w-64 pl-8 pr-10 py-2.5
              bg-transparent border-none
              text-lg font-display font-bold italic tracking-wider text-white placeholder:text-white/20 uppercase
              focus:outline-none focus:ring-0
              transition-all duration-200
            "
                    />
                    {/* Blinking Cursor Decoration (only when empty) */}
                    {!searchQuery && (
                        <div className="absolute right-0 bottom-3 w-2 h-4 bg-crimson-500 animate-pulse pointer-events-none opacity-50" />
                    )}

                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-2 bottom-3 text-white/40 hover:text-white transition-colors"
                        >
                            <X className="w-4 h-4" />
                        </button>
                    )}
                </div>

                {/* Add Game - Text Button */}
                <motion.button
                    onClick={openAddModal}
                    className="
            relative group flex items-center gap-2 px-6 py-2
            text-white/80 hover:text-white
            font-display font-bold italic tracking-tighter uppercase
          "
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                >
                    <span className="relative z-10 text-xl">Add Data</span>
                    <Plus className="relative z-10 w-5 h-5 group-hover:text-crimson-500 transition-colors" />

                    {/* Hover Bracket/Box */}
                    <div className="absolute inset-0 border border-white/10 skew-x-[-12deg] group-hover:border-crimson-500/50 bg-white/0 group-hover:bg-crimson-500/10 transition-all duration-300" />
                </motion.button>
            </div>
        </header>
    )
}
