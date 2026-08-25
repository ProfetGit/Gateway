import { useMemo } from 'react'
import type { Game } from '@/features/game-library/game-library-types'

const SOURCE_LABELS: Record<Game['source'], string> = {
    steam: 'Steam',
    heroic: 'Heroic',
    lutris: 'Lutris',
    shortcut: 'Shortcuts',
    manual: 'Added by you',
}

// Stable display order, independent of whatever order games came back in.
const SOURCE_ORDER: Game['source'][] = ['steam', 'heroic', 'lutris', 'shortcut', 'manual']

export interface LibrarySourceStat {
    key: Game['source']
    label: string
    count: number
}

export interface LibraryStats {
    total: number
    installed: number
    sources: LibrarySourceStat[]
}

/** Counts by source, omitting any source with nothing in it. */
export function useLibraryStats(games: Game[]): LibraryStats {
    return useMemo(() => {
        const counts = new Map<Game['source'], number>()
        for (const game of games) {
            counts.set(game.source, (counts.get(game.source) ?? 0) + 1)
        }

        return {
            total: games.length,
            installed: games.filter((game) => game.isInstalled).length,
            sources: SOURCE_ORDER.filter((key) => (counts.get(key) ?? 0) > 0).map((key) => ({
                key,
                label: SOURCE_LABELS[key],
                count: counts.get(key) ?? 0,
            })),
        }
    }, [games])
}
