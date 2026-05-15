import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export interface AchievementProgress {
    appId: string
    unlocked: number
    total: number
    percentage: number
    gameName?: string
    fetchedAt: number
    error?: string
    errorCode?: string
}

interface AchievementsStore {
    progress: Record<string, AchievementProgress>
    inFlight: Set<string>
    fetchForAppIds: (appIds: string[]) => Promise<void>
}

const TTL_MS = 24 * 60 * 60 * 1000
const MAX_PARALLEL = 5

function isFresh(entry: AchievementProgress | undefined): boolean {
    return !!entry && Date.now() - entry.fetchedAt < TTL_MS
}

// The cache is persisted to localStorage. Only `progress` is persisted —
// `inFlight` is ephemeral request-tracking state that must NEVER survive a
// reload (or a crash mid-fetch would leave appIds permanently locked).
// Bump `version` when AchievementProgress shape changes to bust stale caches.
export const useAchievementsStore = create<AchievementsStore>()(
    persist(
        (set, get) => ({
            progress: {},
            inFlight: new Set<string>(),

            fetchForAppIds: async (appIds) => {
                const { progress, inFlight } = get()

                const needsFetch = appIds.filter(
                    (id) => !isFresh(progress[id]) && !inFlight.has(id)
                )
                if (needsFetch.length === 0) return

                const nextInFlight = new Set(inFlight)
                needsFetch.forEach((id) => nextInFlight.add(id))
                set({ inFlight: nextInFlight })

                let cursor = 0
                const workers: Promise<void>[] = []

                const worker = async () => {
                    while (cursor < needsFetch.length) {
                        const idx = cursor++
                        const appId = needsFetch[idx]
                        try {
                            const result = await window.api?.getAchievements(appId)
                            if (result?.success && result.totalAchievements > 0) {
                                // Floor (not round) so 199/200 stays 99%, not 100%.
                                // Round would mask "closest to finishing" games as completed
                                // in the Hunts band filter and elsewhere.
                                const pct = result.unlockedCount === result.totalAchievements
                                    ? 100
                                    : Math.floor((result.unlockedCount / result.totalAchievements) * 100)
                                const entry: AchievementProgress = {
                                    appId,
                                    unlocked: result.unlockedCount,
                                    total: result.totalAchievements,
                                    percentage: pct,
                                    gameName: result.gameName,
                                    fetchedAt: Date.now(),
                                }
                                set((s) => ({ progress: { ...s.progress, [appId]: entry } }))
                            } else {
                                // Cache the non-eligible state too so we don't retry every mount
                                const entry: AchievementProgress = {
                                    appId,
                                    unlocked: 0,
                                    total: result?.totalAchievements ?? 0,
                                    percentage: 0,
                                    gameName: result?.gameName,
                                    fetchedAt: Date.now(),
                                    error: result?.error,
                                    errorCode: result?.errorCode,
                                }
                                set((s) => ({ progress: { ...s.progress, [appId]: entry } }))
                            }
                        } catch (err) {
                            // Network/IPC failure — leave uncached so we retry next mount
                            console.warn('[Achievements] fetch failed for', appId, err)
                        }
                    }
                }

                for (let i = 0; i < Math.min(MAX_PARALLEL, needsFetch.length); i++) {
                    workers.push(worker())
                }
                await Promise.all(workers)

                set((s) => {
                    const next = new Set(s.inFlight)
                    needsFetch.forEach((id) => next.delete(id))
                    return { inFlight: next }
                })
            },
        }),
        {
            name: 'gateway-achievements',
            storage: createJSONStorage(() => localStorage),
            version: 2,
            // Only persist `progress`. `inFlight` is a Set (doesn't JSON well)
            // and represents in-progress network requests that don't survive
            // a reload anyway.
            partialize: (state) => ({ progress: state.progress }),
            // On rehydrate, ensure `inFlight` is a fresh empty Set — the
            // partialize above drops it, but the type expects it to exist.
            merge: (persisted, current) => ({
                ...current,
                ...(persisted as Partial<AchievementsStore>),
                inFlight: new Set<string>(),
            }),
        }
    )
)
