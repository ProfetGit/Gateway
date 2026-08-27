import { create } from 'zustand'
import type { GameStore } from './game-library-types'
import { updateGame as apiUpdateGame } from './api/update-game'
import { registerGamesUpdatedListener } from './register-games-updated-listener'

export const useGameStore = create<GameStore>((set, get) => {

    return {
        games: [],
        selectedGame: null,

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
        isAchievementsOpen: false,
        isPropertiesOpen: false,
        propertiesGame: null,
        isInstallWizardOpen: false,
        setView: (view) => set({ currentView: view }),

        // selectedGame re-points at the incoming record, else an open detail overlay
        // keeps a stale snapshot and background updates (watcher, sync) don't show.
        setGames: (games) => set((s) => ({ games,
            selectedGame: s.selectedGame ? games.find(g => g.id === s.selectedGame?.id) ?? s.selectedGame : null })),

        addGame: (game) => set((state) => ({
            games: [...state.games, game],
            isAddModalOpen: false,
        })),

        updateGame: (id, updates) => set((state) => ({
            games: state.games.map((g) => g.id === id ? { ...g, ...updates } : g),
            selectedGame: state.selectedGame?.id === id
                ? { ...state.selectedGame, ...updates }
                : state.selectedGame,
            propertiesGame: state.propertiesGame?.id === id
                ? { ...state.propertiesGame, ...updates }
                : state.propertiesGame,
        })),

        deleteGame: (id) => set((state) => ({
            games: state.games.filter((g) => g.id !== id),
            selectedGame: state.selectedGame?.id === id ? null : state.selectedGame,
            isDetailOpen: state.selectedGame?.id === id ? false : state.isDetailOpen,
            isPropertiesOpen: state.propertiesGame?.id === id ? false : state.isPropertiesOpen,
            propertiesGame: state.propertiesGame?.id === id ? null : state.propertiesGame,
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
                apiUpdateGame(id, { isFavorite: !game.isFavorite }).catch(() => {})
            }
        },

        openDetail: (game) => set({
            selectedGame: game,
            isDetailOpen: true,
            isSettingsOpen: false,
            isAddModalOpen: false,
            // The achievements surface belongs to whichever game is open. Left
            // set, it would reopen over the NEXT game the user picks.
            isAchievementsOpen: false,
        }),

        closeDetail: () => set({
            isDetailOpen: false,
            isAchievementsOpen: false,
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

        openHuntsDrawer: () => set({
            isHuntsDrawerOpen: true,
            isDetailOpen: false,
            isSettingsOpen: false,
            isAddModalOpen: false,
        }),

        closeHuntsDrawer: () => set({ isHuntsDrawerOpen: false }),

        // Layers ABOVE the detail overlay rather than replacing it — it is the
        // expanded view of one band, so the detail must still be there behind it.
        openAchievements: () => set({ isAchievementsOpen: true }),

        closeAchievements: () => set({ isAchievementsOpen: false }),

        // Deliberately does NOT close the other overlays: Properties opens on
        // top of GameDetail and hands you back to it on close.
        openProperties: (game) => set({ isPropertiesOpen: true, propertiesGame: game }),

        closeProperties: () => set({ isPropertiesOpen: false, propertiesGame: null }),

        openInstallWizard: () => set({
            isInstallWizardOpen: true,
            isAddModalOpen: false,
            isDetailOpen: false,
            isSettingsOpen: false,
        }),

        closeInstallWizard: () => set({ isInstallWizardOpen: false }),
    }
})

if (typeof window !== 'undefined') {
    registerGamesUpdatedListener((games) => {
        useGameStore.setState({ games })
    })
}
