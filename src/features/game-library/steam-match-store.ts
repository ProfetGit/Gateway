import { create } from 'zustand'
import type { Game } from './game-library-types'

/**
 * Overlay state for the "match this game to a Steam game" modal.
 *
 * This lives in its own store rather than in game-store because game-store is
 * at 197/200 lines and `max-lines` is an eslint error. The load-bearing half of
 * the overlay convention is "mount at the AppShell root" (HomeView's
 * `relative z-10` traps the z-index of anything fixed rendered inside it), not
 * "state must live in game-store" — context-menu-store.ts is the precedent for
 * an overlay owning its own store.
 *
 * Deliberately does NOT close the other overlays: this modal opens on top of
 * GameDetail, which is its main entry point.
 */
interface SteamMatchState {
    isOpen: boolean
    target: Game | null
    open: (game: Game) => void
    close: () => void
}

export const useSteamMatchStore = create<SteamMatchState>((set) => ({
    isOpen: false,
    target: null,
    open: (game) => set({ isOpen: true, target: game }),
    close: () => set({ isOpen: false, target: null }),
}))
