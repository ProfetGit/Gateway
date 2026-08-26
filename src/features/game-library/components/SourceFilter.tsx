import clsx from 'clsx'
import { useGameStore } from '../game-store'
import type { FilterPlatform, Game } from '../game-library-types'

const SOURCE_LABELS: Record<Game['source'], string> = {
    steam: 'Steam',
    heroic: 'Heroic',
    lutris: 'Lutris',
    shortcut: 'Shortcuts',
    manual: 'Added by you',
}

const SOURCE_ORDER: Game['source'][] = ['steam', 'heroic', 'lutris', 'shortcut', 'manual']

/**
 * Chip row for filtering the library by where a game came from. Only renders
 * sources that actually have games, and hides itself entirely when there is
 * nothing to choose between — same auto-hide convention the home sections use.
 */
export function SourceFilter() {
    const { games, filters, setFilterPlatform } = useGameStore()

    const present = new Set(games.map((game) => game.source))
    const available = SOURCE_ORDER.filter((source) => present.has(source))
    if (available.length < 2) return null

    const options: { id: FilterPlatform; label: string }[] = [
        { id: 'all', label: 'All' },
        ...available.map((source) => ({ id: source, label: SOURCE_LABELS[source] })),
    ]

    return (
        <div className="flex items-center gap-1.5">
            {options.map((option) => {
                const isActive = filters.platform === option.id
                return (
                    <button
                        key={option.id}
                        onClick={() => setFilterPlatform(option.id)}
                        className={clsx(
                            'px-3 py-1 font-mono text-[10px] uppercase tracking-widest font-bold border transition-colors duration-100 ease-out-expo',
                            isActive
                                ? 'text-white border-crimson-500/70 bg-crimson-500/15'
                                : 'text-white/40 border-white/10 hover:text-white hover:border-white/25'
                        )}
                    >
                        {option.label}
                    </button>
                )
            })}
        </div>
    )
}
