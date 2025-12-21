import { create } from 'zustand'
import type { GameStore } from '../types/game'

export const useGameStore = create<GameStore>((set, get) => ({
    games: [],
    selectedGame: null,
    filter: 'all',
    searchQuery: '',
    isDetailOpen: false,
    isSettingsOpen: false,
    isAddModalOpen: false,
    currentView: 'home',

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

    setFilter: (filter) => set({ filter, currentView: 'library' }),

    setSearchQuery: (searchQuery) => set({ searchQuery }),

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

    closeAddModal: () => set({ isAddModalOpen: false }),
}))

// Selector hooks for filtered games
export const useFilteredGames = () => {
    const { games, filter, searchQuery } = useGameStore()

    return games.filter((game) => {
        // Apply search filter
        if (searchQuery) {
            const query = searchQuery.toLowerCase()
            if (!game.title.toLowerCase().includes(query)) {
                return false
            }
        }

        // Apply category filter
        switch (filter) {
            case 'installed':
                return game.isInstalled
            case 'favorites':
                return game.isFavorite
            case 'steam':
                return game.source === 'steam'
            case 'not-installed':
                return !game.isInstalled && game.source === 'steam'
            default:
                return true
        }
    })
}
