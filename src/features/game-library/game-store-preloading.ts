import type { StoreApi } from 'zustand'
import type { GameStore } from './game-library-types'
import { preloadGameCoverBatch } from './game-cover-preloader'

// Cover-art preloading, lifted out of game-store.ts purely to keep that file
// under the 200-line cap. It is still part of the same store — it reads and
// writes the same state through the set/get it is handed.

type Set = StoreApi<GameStore>['setState']
type Get = StoreApi<GameStore>['getState']

export function createPreloadActions(set: Set, get: Get) {
    return {
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
                await preloadGameCoverBatch(batch)

                // Update cursor
                set((state) => ({
                    preloadState: { ...state.preloadState, cursor: batchEnd }
                }))

                // Continue with next batch (small delay for responsiveness)
                setTimeout(processBatch, 10)
            }

            processBatch()
        }
    }
}
