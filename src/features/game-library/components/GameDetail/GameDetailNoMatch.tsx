import { motion } from 'framer-motion'
import { Link2 } from 'lucide-react'
import { useSteamMatchStore } from '../../steam-match-store'
import type { Game } from '../../game-library-types'

interface GameDetailNoMatchProps {
    game: Game
    icon: React.ReactNode
    message: string
}

/**
 * Empty state for a game that has no Steam match yet — offers the fix inline
 * instead of leaving a dead end.
 */
export function GameDetailNoMatch({ game, icon, message }: GameDetailNoMatchProps) {
    const openSteamMatch = useSteamMatchStore((s) => s.open)

    return (
        <motion.div
            className="flex flex-col items-center justify-center py-20 text-center"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
        >
            <div className="w-16 h-16 rounded-full bg-void-surface flex items-center justify-center mb-6 text-white/20">
                {icon}
            </div>
            <h3 className="text-xl font-display font-bold italic text-white/60 mb-2">
                No Steam match yet
            </h3>
            <p className="text-sm text-white/30 max-w-xs mb-6">{message}</p>
            <button
                type="button"
                onClick={() => openSteamMatch(game)}
                className="flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-crimson-500 text-white rounded hover:bg-crimson-400 transition-colors duration-100 ease-out-expo"
            >
                <Link2 className="w-4 h-4" />
                Match to Steam game
            </button>
        </motion.div>
    )
}
