import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useGameStore } from '../game-store'
import { selectExecutable, selectImage } from '@/lib/api/file-dialogs'
import { addGame as apiAddGame } from '../api/add-game'
import { AddGameForm } from './AddGameForm'
import { AddGameActions } from './AddGameActions'

export function AddGameModal() {
    const { isAddModalOpen, closeAddModal, addGame } = useGameStore()

    const [title, setTitle] = useState('')
    const [coverUrl, setCoverUrl] = useState('')
    const [executablePath, setExecutablePath] = useState('')
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
            const newGame = await apiAddGame({
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
                                <AddGameForm
                                    title={title}
                                    setTitle={setTitle}
                                    coverUrl={coverUrl}
                                    setCoverUrl={setCoverUrl}
                                    executablePath={executablePath}
                                    setExecutablePath={setExecutablePath}
                                    onSelectImage={handleSelectImage}
                                    onSelectExecutable={handleSelectExecutable}
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
