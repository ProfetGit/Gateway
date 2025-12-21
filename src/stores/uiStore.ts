import { create } from 'zustand'

interface UIStore {
    isScrolled: boolean
    setIsScrolled: (scrolled: boolean) => void
}

export const useUIStore = create<UIStore>((set) => ({
    isScrolled: false,
    setIsScrolled: (isScrolled) => set({ isScrolled }),
}))
