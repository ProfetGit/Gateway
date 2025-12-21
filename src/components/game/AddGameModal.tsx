import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FolderOpen, Image } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'

export function AddGameModal() {
    const { isAddModalOpen, closeAddModal, addGame } = useGameStore()

    const [title, setTitle] = useState('')
    const [coverUrl, setCoverUrl] = useState('')
    const [executablePath, setExecutablePath] = useState('')
    const [isSubmitting, setIsSubmitting] = useState(false)

    const handleSelectExecutable = async () => {
        const path = await window.api?.selectExecutable()
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
        const path = await window.api?.selectImage()
        if (path) {
            setCoverUrl(`file://${path}`)
        }
    }

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!title.trim()) return

        setIsSubmitting(true)

        try {
            const newGame = await window.api?.addGame({
                title: title.trim(),
                coverUrl: coverUrl || undefined,
                executablePath: executablePath || undefined,
                isInstalled: !!executablePath,
                isFavorite: false,
                source: 'manual',
            })

            if (newGame) {
                addGame(newGame)
            }

            // Reset form
            setTitle('')
            setCoverUrl('')
            setExecutablePath('')
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
                        <div className="bg-void-elevated border border-void-border rounded-xl shadow-void-float overflow-hidden">
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
                            <form onSubmit={handleSubmit} className="p-6 space-y-5">
                                {/* Title */}
                                <div>
                                    <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
                                        Title *
                                    </label>
                                    <input
                                        type="text"
                                        value={title}
                                        onChange={(e) => setTitle(e.target.value)}
                                        placeholder="Game title"
                                        required
                                        className="
                      w-full px-4 py-2.5
                      bg-void-surface border border-void-border rounded-lg
                      text-text-primary placeholder:text-text-ghost
                      focus:outline-none focus:border-crimson-900/50 focus:ring-1 focus:ring-crimson-900/30
                      transition-all duration-200
                    "
                                    />
                                </div>

                                {/* Cover Image */}
                                <div>
                                    <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
                                        Cover Image
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={coverUrl}
                                            onChange={(e) => setCoverUrl(e.target.value)}
                                            placeholder="Image URL or select file"
                                            className="
                        flex-1 px-4 py-2.5
                        bg-void-surface border border-void-border rounded-lg
                        text-text-primary placeholder:text-text-ghost font-mono text-sm
                        focus:outline-none focus:border-crimson-900/50 focus:ring-1 focus:ring-crimson-900/30
                        transition-all duration-200
                      "
                                        />
                                        <motion.button
                                            type="button"
                                            onClick={handleSelectImage}
                                            className="px-3 py-2.5 bg-void-surface border border-void-border rounded-lg text-text-muted hover:text-text-primary transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <Image className="w-4 h-4" />
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Executable */}
                                <div>
                                    <label className="block text-xs font-mono text-text-muted uppercase tracking-wider mb-2">
                                        Executable Path
                                    </label>
                                    <div className="flex gap-2">
                                        <input
                                            type="text"
                                            value={executablePath}
                                            onChange={(e) => setExecutablePath(e.target.value)}
                                            placeholder="Path to game executable"
                                            className="
                        flex-1 px-4 py-2.5
                        bg-void-surface border border-void-border rounded-lg
                        text-text-primary placeholder:text-text-ghost font-mono text-sm
                        focus:outline-none focus:border-crimson-900/50 focus:ring-1 focus:ring-crimson-900/30
                        transition-all duration-200
                      "
                                        />
                                        <motion.button
                                            type="button"
                                            onClick={handleSelectExecutable}
                                            className="px-3 py-2.5 bg-void-surface border border-void-border rounded-lg text-text-muted hover:text-text-primary transition-colors"
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                        >
                                            <FolderOpen className="w-4 h-4" />
                                        </motion.button>
                                    </div>
                                </div>

                                {/* Submit */}
                                <div className="pt-2">
                                    <motion.button
                                        type="submit"
                                        disabled={!title.trim() || isSubmitting}
                                        className="
                      w-full py-3
                      bg-crimson-600 hover:bg-crimson-500 disabled:bg-crimson-900/50 disabled:cursor-not-allowed
                      text-white font-medium
                      rounded-lg shadow-crimson-glow
                      transition-all duration-200
                    "
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                    >
                                        {isSubmitting ? 'Adding...' : 'Add to Library'}
                                    </motion.button>
                                </div>
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
