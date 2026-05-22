import { create } from 'zustand'
import { useMemo } from 'react'
import type { GameStore } from '../types/game'
import { filterAndSortGames } from '../lib/gameFilters'

let _gamesUpdatedListenerRegistered = false

export const useGameStore = create<GameStore>((set, get) => {
    // Listen for updates from main process (e.g. cover mirroring completion).
    // Guard prevents duplicate listeners on HMR re-evaluation.
    if (typeof window !== 'undefined' && window.api && !_gamesUpdatedListenerRegistered) {
        _gamesUpdatedListenerRegistered = true
        window.api.onGamesUpdated((updatedGames) => {
            set({ games: updatedGames, preloadState: { cursor: 0, isActive: false } })
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
        isHuntsDrawerOpen: false,
        isSetupWizardOpen: false,

        setView: (view) => set({ currentView: view }),

        setGames: (games) => set({ games, preloadState: { cursor: 0, isActive: false } }),

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

        resetPreload: () => {
            set({ preloadState: { cursor: 0, isActive: false } })
        },

        startPreloading: () => {
            const { games, preloadState } = get()
            if (preloadState.isActive || preloadState.cursor >= games.length) return

            set((state) => ({
                preloadState: { ...state.preloadState, isActive: true }
            }))

            // Concurrent batch preloading — loads 8 images at a time
            const BATCH_SIZE = 8

            const processBatch = async () => {
                const { games, preloadState, stopPreloading } = get()

                if (!preloadState.isActive) return
                if (preloadState.cursor >= games.length) {
                    stopPreloading()
                    return
                }

                // Get next batch of games
                const batchStart = preloadState.cursor
                const batchEnd = Math.min(batchStart + BATCH_SIZE, games.length)
                const batch = games.slice(batchStart, batchEnd)

                // Preload batch concurrently
                await Promise.all(
                    batch.map((game) => {
                        const coverUrl = game.coverUrl
                        if (!coverUrl && !game.localCoverPath) return Promise.resolve()
                        return new Promise<void>((resolve) => {
                            const img = new Image()
                            img.onload = () => resolve()
                            img.onerror = () => resolve()
                            img.src = game.localCoverPath
                                ? `gateway://cover/${game.localCoverPath}`
                                : coverUrl!
                        })
                    })
                )

                // Update cursor
                set((state) => ({
                    preloadState: { ...state.preloadState, cursor: batchEnd }
                }))

                // Continue with next batch (small delay for responsiveness)
                setTimeout(processBatch, 10)
            }

            processBatch()
        },

        closeAddModal: () => set({ isAddModalOpen: false }),

        openHuntsDrawer: () => set({
            isHuntsDrawerOpen: true,
            isDetailOpen: false,
            isSettingsOpen: false,
            isAddModalOpen: false,
        }),

        closeHuntsDrawer: () => set({ isHuntsDrawerOpen: false }),

        openSetupWizard: () => set({
            isSetupWizardOpen: true,
            isDetailOpen: false,
            isSettingsOpen: false,
            isAddModalOpen: false,
            isHuntsDrawerOpen: false,
        }),

        closeSetupWizard: () => set({ isSetupWizardOpen: false }),
    }
})

// Selector hooks for filtered games
export const useFilteredGames = () => {
    const games = useGameStore(state => state.games)
    const filters = useGameStore(state => state.filters)

    return useMemo(() => filterAndSortGames(games, filters), [games, filters])
}
