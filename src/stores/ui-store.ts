import { create } from 'zustand'

interface UIStore {
    isScrolled: boolean
    setIsScrolled: (scrolled: boolean) => void
    gridSize: number
    setGridSize: (size: number) => void
}

const GRID_SIZE_KEY = 'gateway-grid-size'
const DEFAULT_GRID_SIZE = 180

export const useUIStore = create<UIStore>((set) => ({
    isScrolled: false,
    setIsScrolled: (isScrolled) => set({ isScrolled }),
    gridSize: Number(localStorage.getItem(GRID_SIZE_KEY)) || DEFAULT_GRID_SIZE,
    setGridSize: (size) => {
        localStorage.setItem(GRID_SIZE_KEY, String(size))
        set({ gridSize: size })
    },
}))
