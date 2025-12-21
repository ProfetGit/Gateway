import { create } from 'zustand'
import { useMemo } from 'react'
import type { GameStore } from '../types/game'

export const useGameStore = create<GameStore>((set, get) => {
    // Listen for updates from main process (e.g. cover mirroring completion)
    if (typeof window !== 'undefined' && window.api) {
        window.api.onGamesUpdated((updatedGames) => {
            set({ games: updatedGames })
        })
    }

    return {
        games: [],
        selectedGame: null,

        // Initial Preload State
        preloadState: {
            cursor: 0,
            isActive: false
        },

        currentView: 'home',
        filters: {
            status: 'all',
            platform: 'all',
            onlyFavorites: false,
            search: '',
            sortBy: 'alphabetical',
            sortOrder: 'asc'
        },

        isDetailOpen: false,
        isSettingsOpen: false,
        isAddModalOpen: false,

        setView: (view) => set({ currentView: view }),

        setGames: (games) => set({ games }),

        addGame: (game) => set((state) => ({
            games: [...state.games, game],
            isAddModalOpen: false,
        })),

        updateGame: (id, updates) => set((state) => ({
            games: state.games.map((g) => g.id === id ? { ...g, ...updates } : g),
            selectedGame: state.selectedGame?.id === id
                ? { ...state.selectedGame, ...updates }
                : state.selectedGame,
        })),

        deleteGame: (id) => set((state) => ({
            games: state.games.filter((g) => g.id !== id),
            selectedGame: state.selectedGame?.id === id ? null : state.selectedGame,
            isDetailOpen: state.selectedGame?.id === id ? false : state.isDetailOpen,
        })),

        selectGame: (game) => set({ selectedGame: game }),

        // Filter Actions
        setFilterStatus: (status) => set((state) => ({
            filters: { ...state.filters, status },
            currentView: 'library'
        })),

        setFilterPlatform: (platform) => set((state) => ({
            filters: { ...state.filters, platform },
            currentView: 'library'
        })),

        toggleOnlyFavorites: () => set((state) => ({
            filters: { ...state.filters, onlyFavorites: !state.filters.onlyFavorites },
            currentView: 'library'
        })),

        setSearchQuery: (search) => set((state) => ({
            filters: { ...state.filters, search }
        })),

        setSort: (sortBy, sortOrder) => set((state) => ({
            filters: { ...state.filters, sortBy, sortOrder }
        })),

        resetFilters: () => set({
            filters: {
                status: 'all',
                platform: 'all',
                onlyFavorites: false,
                search: '',
                sortBy: 'alphabetical',
                sortOrder: 'asc'
            }
        }),

        toggleFavorite: (id) => {
            const { games, updateGame } = get()
            const game = games.find((g) => g.id === id)
            if (game) {
                updateGame(id, { isFavorite: !game.isFavorite })
                // Persist to electron
                window.api?.updateGame(id, { isFavorite: !game.isFavorite })
            }
        },

        openDetail: (game) => set({
            selectedGame: game,
            isDetailOpen: true,
            isSettingsOpen: false,
            isAddModalOpen: false,
        }),

        closeDetail: () => set({
            isDetailOpen: false,
            // Keep selectedGame for potential re-open animation
        }),

        openSettings: () => set({
            isSettingsOpen: true,
            isDetailOpen: false,
            isAddModalOpen: false,
        }),

        closeSettings: () => set({ isSettingsOpen: false }),

        openAddModal: () => set({
            isAddModalOpen: true,
            isDetailOpen: false,
            isSettingsOpen: false,
        }),

        stopPreloading: () => {
            const { isActive } = get().preloadState
            if (isActive) {
                set((state) => ({
                    preloadState: { ...state.preloadState, isActive: false }
                }))
            }
        },

        startPreloading: () => {
            const { games, preloadState } = get()
            if (preloadState.isActive || preloadState.cursor >= games.length) return

            set((state) => ({
                preloadState: { ...state.preloadState, isActive: true }
            }))

            // We use a recursive timeout approach to allow interruption
            const processNext = () => {
                const { games, preloadState, stopPreloading } = get()

                // Check if we should stop
                if (!preloadState.isActive) return
                if (preloadState.cursor >= games.length) {
                    stopPreloading()
                    return
                }

                // Process one game
                const game = games[preloadState.cursor]
                if (game?.coverUrl) {
                    const img = new Image()
                    img.src = game.coverUrl
                }

                // Move cursor and schedule next
                set((state) => ({
                    preloadState: { ...state.preloadState, cursor: state.preloadState.cursor + 1 }
                }))

                // Small delay to keep UI responsive and allow cancellation
                setTimeout(processNext, 20)
            }

            processNext()
        },

        closeAddModal: () => set({ isAddModalOpen: false }),
    }
})

// Selector hooks for filtered games
export const useFilteredGames = () => {
    const games = useGameStore(state => state.games)
    const filters = useGameStore(state => state.filters)

    return useMemo(() => {
        const filtered = games.filter((game) => {
            const { status, platform, onlyFavorites, search } = filters

            // 1. Search Filter
            if (search) {
                const query = search.toLowerCase()
                if (!game.title.toLowerCase().includes(query)) {
                    return false
                }
            }

            // 2. Status Filter
            if (status === 'installed' && !game.isInstalled) return false

            // 3. Platform Filter
            if (platform === 'steam' && game.source !== 'steam') return false

            // 4. Favorites Filter
            if (onlyFavorites && !game.isFavorite) return false

            return true
        })

        // Sorting
        return filtered.sort((a, b) => {
            const { sortBy, sortOrder } = filters
            let valA: any
            let valB: any

            switch (sortBy) {
                case 'alphabetical':
                    valA = a.title.toLowerCase()
                    valB = b.title.toLowerCase()
                    break
                case 'playtime':
                    valA = a.playtime || 0
                    valB = b.playtime || 0
                    break
                case 'lastPlayed':
                    valA = a.lastPlayed ? new Date(a.lastPlayed).getTime() : 0
                    valB = b.lastPlayed ? new Date(b.lastPlayed).getTime() : 0
                    break
                default:
                    valA = a.title
                    valB = b.title
            }

            if (valA < valB) return sortOrder === 'asc' ? -1 : 1
            if (valA > valB) return sortOrder === 'asc' ? 1 : -1
            return 0
        })
    }, [games, filters])
}
