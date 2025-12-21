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
        <header className="h-14 flex items-center justify-between px-6 border-b border-void-border bg-void-pure/50 backdrop-blur-sm shrink-0">
            {/* Title & Count */}
            <div className="flex items-center gap-4">
                <h1 className="text-xl font-semibold text-text-primary tracking-tight">
                    {filterLabel[filter]}
                </h1>
                <span className="px-2 py-0.5 text-xs font-mono text-text-muted bg-void-surface border border-void-border rounded">
                    {gameCount} {gameCount === 1 ? 'game' : 'games'}
                </span>
            </div>

            {/* Actions */}
            <div className="flex items-center gap-3">
                {/* Search */}
                <div className="relative group glitch-border">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted group-focus-within:text-crimson-500 transition-colors" />
                    <input
                        type="text"
                        placeholder="Search games..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="
              w-64 pl-10 pr-8 py-2 
              bg-void-surface border border-void-border rounded-lg
              text-sm font-mono text-text-primary placeholder:text-text-ghost
              focus:outline-none focus:border-crimson-900/50 focus:ring-1 focus:ring-crimson-900/30
              transition-all duration-200
            "
                    />
                    {searchQuery && (
                        <button
                            onClick={() => setSearchQuery('')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary transition-colors"
                        >
                            <X className="w-3.5 h-3.5" />
                        </button>
                    )}
                </div>

                {/* Add Game */}
                <motion.button
                    onClick={openAddModal}
                    className="
            flex items-center gap-2 px-4 py-2
            bg-crimson-600 hover:bg-crimson-500 
            text-white text-sm font-medium
            rounded-lg shadow-crimson-glow
            transition-all duration-200
          "
                    whileHover={{ scale: 1.02, boxShadow: '0 0 30px rgba(255, 58, 58, 0.4)' }}
                    whileTap={{ scale: 0.98 }}
                >
                    <Plus className="w-4 h-4" />
                    <span>Add Game</span>
                </motion.button>
            </div>
        </header>
    )
}
