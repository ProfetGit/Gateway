import type { Game, FilterState } from '../types/game'

export function filterAndSortGames(games: Game[], filters: FilterState): Game[] {
    const { status, platform, onlyFavorites, search, sortBy, sortOrder } = filters

    const filtered = games.filter((game) => {
        if (search) {
            const query = search.toLowerCase()
            if (!game.title.toLowerCase().includes(query)) return false
        }

        if (status === 'installed' && !game.isInstalled) return false
        if (platform === 'steam' && game.source !== 'steam') return false
        if (onlyFavorites && !game.isFavorite) return false

        return true
    })

    return filtered.sort((a, b) => {
        let valA: string | number
        let valB: string | number

        switch (sortBy) {
            case 'alphabetical':
                valA = a.title.toLowerCase()
                valB = b.title.toLowerCase()
                break
            case 'playtime':
                valA = a.playtime ?? 0
                valB = b.playtime ?? 0
                break
            case 'lastPlayed':
                valA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0
                valB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0
                break
            default:
                valA = a.title.toLowerCase()
                valB = b.title.toLowerCase()
        }

        if (valA < valB) return sortOrder === 'asc' ? -1 : 1
        if (valA > valB) return sortOrder === 'asc' ? 1 : -1
        return 0
    })
}
