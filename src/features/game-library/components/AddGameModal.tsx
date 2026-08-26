import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, PackagePlus } from 'lucide-react'
import { useGameStore } from '../game-store'
import { selectExecutable, selectImage } from '@/lib/api/file-dialogs'
import { addGame as apiAddGame } from '../api/add-game'
import { getLaunchSettings } from '@/lib/api/launch-settings'
import { fetchGameArt } from '../api/fetch-game-art'
import type { SteamMatchHit } from './SteamMatchResults'
import { AddGameForm } from './AddGameForm'
import { AddGameActions } from './AddGameActions'

export function AddGameModal() {
    const { isAddModalOpen, closeAddModal, addGame, openInstallWizard } = useGameStore()

    const [title, setTitle] = useState('')
    const [coverUrl, setCoverUrl] = useState('')
    const [executablePath, setExecutablePath] = useState('')
    const [linkedAppId, setLinkedAppId] = useState<string | undefined>(undefined)
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSelectExecutable = async () => {
        const path = await selectExecutable()
        if (path) {
            setExecutablePath(path)
            // Auto-fill title from filename if empty
            if (!title) {
                const filename = path.split('/').pop()?.replace(/\.(exe|sh|AppImage)$/i, '') || ''
                setTitle(filename)
            }
        }
    }

    const handleSelectImage = async () => {
        const path = await selectImage()
        if (path) {
            setCoverUrl(`file://${path}`)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setIsSubmitting(true)

        try {
            // Global defaults seed the new game's own values here, once.
            // They are never re-read at launch, so what Properties shows for
            // this game afterwards is exactly what runs.
            const defaults = await getLaunchSettings().catch(() => null)

            const newGame = await apiAddGame({
                title: title.trim(),
                coverUrl: coverUrl || undefined,
                executablePath: executablePath || undefined,
                isInstalled: !!executablePath,
                isFavorite: false,
                source: 'manual',
                // metadataAppId, not steamAppId: picking a Steam suggestion
                // links the game for art, news and achievements — it does not
                // mean the user owns it there.
                metadataAppId: linkedAppId,
                protonPath: defaults?.defaultProtonPath,
                useMangoHud: defaults?.defaultUseMangoHud,
                useGameMode: defaults?.defaultUseGameMode,
            })

            if (newGame) {
                addGame(newGame)
                // Fire and forget: fetch_game_art emits games-updated itself,
                // so the modal doesn't sit open through three downloads.
                if (linkedAppId) {
                    void fetchGameArt(newGame.id).catch((err) => {
                        console.error('Failed to fetch art for the new game:', err)
                    })
                }
            }

            // Reset form
            setTitle('')
            setCoverUrl('')
            setExecutablePath('')
            setLinkedAppId(undefined)
            closeAddModal()
        } catch (error) {
            console.error('Failed to add game:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const handleClose = () => {
        setTitle('')
        setCoverUrl('')
        setExecutablePath('')
        setLinkedAppId(undefined)
        closeAddModal()
    }

    return (
        <AnimatePresence>
            {isAddModalOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={handleClose}
                    />

                    {/* Modal */}
                    <motion.div
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* No overflow-hidden: the title field's Steam suggestions drop
                            below the input and would be clipped by it. */}
                        <div className="bg-void-elevated border border-void-border rounded-xl shadow-void-float">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-4 border-b border-void-border">
                                <h2 className="text-lg font-semibold text-text-primary">Add Game</h2>
                                <motion.button
                                    onClick={handleClose}
                                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-void-surface rounded transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X className="w-4 h-4" />
                                </motion.button>
                            </div>

                            {/* Form */}
                            {/* The other half of adding a game: run its
                                installer first, then point Gateway at what it
                                produced. */}
                            <button
                                type="button"
                                onClick={openInstallWizard}
                                className="w-full px-6 py-3 flex items-center gap-2.5 border-b border-void-border text-left hover:bg-void-surface transition-colors duration-100"
                            >
                                <PackagePlus className="w-4 h-4 text-crimson-500 shrink-0" />
                                <span className="min-w-0">
                                    <span className="block text-sm text-text-primary">Run an installer instead</span>
                                    <span className="block text-xs text-text-ghost">
                                        For a Windows game you have not installed yet
                                    </span>
                                </span>
                            </button>

                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                <AddGameForm
                                    title={title}
                                    setTitle={setTitle}
                                    coverUrl={coverUrl}
                                    setCoverUrl={setCoverUrl}
                                    executablePath={executablePath}
                                    setExecutablePath={setExecutablePath}
                                    onSelectImage={handleSelectImage}
                                    onSelectExecutable={handleSelectExecutable}
                                    linkedAppId={linkedAppId}
                                    onLink={(hit: SteamMatchHit | null) => setLinkedAppId(hit?.appId)}
                                />
                                <AddGameActions disabled={!title.trim() || isSubmitting} isSubmitting={isSubmitting} />
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
