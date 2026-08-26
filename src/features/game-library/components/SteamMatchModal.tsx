import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Link2 } from 'lucide-react'
import { useSteamMatchStore } from '../steam-match-store'
import { useSteamAppSearch } from '../use-steam-app-search'
import { useGameStore } from '../game-store'
import { updateGame as apiUpdateGame } from '../api/update-game'
import { fetchGameArt } from '../api/fetch-game-art'
import { SteamMatchResults } from './SteamMatchResults'

export function SteamMatchModal() {
    const { isOpen, target, close } = useSteamMatchStore()
    const updateGameInStore = useGameStore((s) => s.updateGame)

    const [query, setQuery] = useState('')
    const [selectedAppId, setSelectedAppId] = useState<string | null>(null)
    const [isSaving, setIsSaving] = useState(false)

    // Same debounce, minimum length and main-process cache as the title
    // field's suggestion dropdown.
    const { results, isLoading, error } = useSteamAppSearch(query, isOpen)

    // Seed the search with the game's own title when the modal opens. We
    // auto-suggest but never auto-commit — Steam's search returns near-misses,
    // and binding the wrong appid would quietly show the wrong achievements.
    useEffect(() => {
        if (!isOpen || !target) return
        setQuery(target.title)
        setSelectedAppId(target.metadataAppId ?? null)
    }, [isOpen, target])

    const persist = async (metadataAppId: string | undefined) => {
        if (!target) return
        setIsSaving(true)
        try {
            // Optimistic — update_game does not emit games-updated.
            updateGameInStore(target.id, { metadataAppId })
            await apiUpdateGame(target.id, { metadataAppId })
            close()

            // Matching is how a game without Steam art gets any. Fire and
            // forget: fetch_game_art emits games-updated itself, and the
            // modal should not sit open through three network round-trips.
            if (metadataAppId) {
                void fetchGameArt(target.id).catch((err) => {
                    console.error('Failed to fetch art for the matched game:', err)
                })
            }
        } catch (err) {
            console.error('Failed to save Steam match:', err)
            updateGameInStore(target.id, { metadataAppId: target.metadataAppId })
        } finally {
            setIsSaving(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && target && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={close}
                    />

                    <motion.div
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[61] w-full max-w-lg"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="bg-void-elevated border border-void-border rounded-xl shadow-void-float overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-void-border">
                                <div className="flex items-center gap-2.5">
                                    <Link2 className="w-4 h-4 text-crimson-500" />
                                    <h2 className="text-lg font-semibold text-text-primary">Match to a Steam game</h2>
                                </div>
                                <motion.button
                                    onClick={close}
                                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-void-surface rounded transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X className="w-4 h-4" />
                                </motion.button>
                            </div>

                            <div className="p-6 space-y-4">
                                <p className="text-sm text-text-secondary">
                                    Pick the Steam game this matches to show its details, news, and achievements.
                                </p>

                                <input
                                    autoFocus
                                    value={query}
                                    onChange={(e) => setQuery(e.target.value)}
                                    placeholder="Search Steam by name"
                                    className="w-full px-3 py-2 bg-void-surface border border-void-border rounded text-sm text-text-primary placeholder:text-text-ghost focus:outline-none focus:border-crimson-500/60 transition-colors"
                                />

                                <SteamMatchResults
                                    results={results}
                                    isLoading={isLoading}
                                    error={error}
                                    selectedAppId={selectedAppId}
                                    onSelect={setSelectedAppId}
                                />

                                <div className="flex items-center justify-between gap-3 pt-1">
                                    {target.metadataAppId ? (
                                        <button
                                            type="button"
                                            onClick={() => persist(undefined)}
                                            disabled={isSaving}
                                            className="text-xs font-mono uppercase tracking-widest text-text-muted hover:text-crimson-400 transition-colors disabled:opacity-50"
                                        >
                                            Remove match
                                        </button>
                                    ) : <span />}

                                    <div className="flex items-center gap-2">
                                        <button
                                            type="button"
                                            onClick={close}
                                            className="px-4 py-2 text-sm text-text-secondary hover:text-text-primary transition-colors"
                                        >
                                            Cancel
                                        </button>
                                        <button
                                            type="button"
                                            onClick={() => selectedAppId && persist(selectedAppId)}
                                            disabled={!selectedAppId || isSaving}
                                            className="px-5 py-2 text-sm font-semibold bg-crimson-500 text-white rounded hover:bg-crimson-400 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
                                        >
                                            {isSaving ? 'Saving' : 'Match'}
                                        </button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
