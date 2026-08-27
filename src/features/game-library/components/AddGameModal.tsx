import { useCallback, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ArrowLeft, X } from 'lucide-react'
import { ActionStrip } from '@/components/ui/ActionStrip'
import { CornerBrackets } from '@/components/ui/CornerBrackets'
import { getLaunchSettings } from '@/lib/api/launch-settings'
import { useGameStore } from '../game-store'
import { addGame as apiAddGame } from '../api/add-game'
import { fetchGameArt } from '../api/fetch-game-art'
import { AddGameChoose } from './AddGameChoose'
import { AddGameReview } from './AddGameReview'
import { useAddGameForm } from './use-add-game-form'

export function AddGameModal() {
    const { isAddModalOpen, closeAddModal, addGame, openInstallWizard } = useGameStore()
    const [isSubmitting, setIsSubmitting] = useState(false)
    const form = useAddGameForm()
    const { reset } = form

    const handleClose = useCallback(() => {
        reset()
        closeAddModal()
    }, [reset, closeAddModal])

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!form.title.trim() || isSubmitting) return

        setIsSubmitting(true)
        try {
            // Global defaults seed the new game's own values here, once. They are
            // never re-read at launch, so what Properties shows for this game
            // afterwards is exactly what runs.
            const defaults = await getLaunchSettings().catch(() => null)

            const newGame = await apiAddGame({
                title: form.title.trim(),
                coverUrl: form.coverUrl || undefined,
                executablePath: form.executablePath || undefined,
                isInstalled: !!form.executablePath,
                isFavorite: false,
                source: 'manual',
                // metadataAppId, not steamAppId: linking a match gets art, news
                // and achievement definitions — it does not mean the user owns
                // the game on Steam, and launching through it would fail.
                metadataAppId: form.linked?.appId,
                protonPath: defaults?.defaultProtonPath,
                useMangoHud: defaults?.defaultUseMangoHud,
                useGameMode: defaults?.defaultUseGameMode,
            })

            if (newGame) {
                addGame(newGame)
                // Fire and forget: fetch_game_art emits games-updated itself, so
                // the modal does not sit open through three downloads.
                if (form.linked) {
                    void fetchGameArt(newGame.id).catch((err) => {
                        console.error('Failed to fetch art for the new game:', err)
                    })
                }
            }
            handleClose()
        } catch (error) {
            console.error('Failed to add game:', error)
        } finally {
            setIsSubmitting(false)
        }
    }

    const onReview = form.step === 'review'

    return (
        <AnimatePresence>
            {isAddModalOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 z-40 bg-void-pure/85 backdrop-blur-md"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        onClick={handleClose}
                    />

                    <motion.div
                        className="fixed left-1/2 top-1/2 z-50 w-full max-w-[620px] -translate-x-1/2 -translate-y-1/2"
                        initial={{ opacity: 0, scale: 0.985, y: 14 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.99, y: 8 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* No overflow-hidden: nothing may clip a dropdown or the brackets. */}
                        <div className="relative bg-void-pure border border-void-border shadow-void-float">
                            <CornerBrackets colorClass="border-crimson-500/70" size={26} thickness={2} />

                            <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-void-border">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-crimson-400">
                                        {onReview ? 'Step 2 of 2 · check it looks right' : 'Step 1 of 2'}
                                    </p>
                                    <h2 className="mt-1.5 font-display font-black italic text-[22px] tracking-[-0.02em] text-white truncate">
                                        {onReview ? (form.title.trim() || 'Your game') : 'Add a game'}
                                    </h2>
                                </div>

                                <div className="flex items-center gap-1.5 shrink-0">
                                    {onReview && (
                                        <button
                                            type="button"
                                            onClick={() => form.setStep('choose')}
                                            aria-label="Back"
                                            className="w-[34px] h-[34px] flex items-center justify-center border border-void-border/70 text-white/40 hover:text-white hover:border-crimson-500 transition-colors duration-100 ease-out-expo"
                                        >
                                            <ArrowLeft className="w-4 h-4" />
                                        </button>
                                    )}
                                    <button
                                        type="button"
                                        onClick={handleClose}
                                        aria-label="Close"
                                        className="w-[34px] h-[34px] flex items-center justify-center border border-void-border/70 text-white/40 hover:text-white hover:bg-crimson-600 hover:border-crimson-500 transition-colors duration-100 ease-out-expo"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                </div>
                            </header>

                            <form onSubmit={handleSubmit} className="px-6 pt-5 pb-6">
                                {onReview ? (
                                    <>
                                        <AddGameReview
                                            title={form.title}
                                            onTitle={form.editTitle}
                                            executablePath={form.executablePath}
                                            onBrowseExecutable={() => void form.browseExecutable()}
                                            coverUrl={form.coverUrl}
                                            onBrowseCover={() => void form.browseCover()}
                                            linked={form.linked}
                                            suggestions={form.suggestions}
                                            isSearching={form.isSearching}
                                            onLink={form.chooseMatch}
                                        />
                                        <ActionStrip
                                            type="submit"
                                            label={isSubmitting ? 'Adding' : 'Add to library'}
                                            disabled={!form.title.trim() || isSubmitting}
                                            className="mt-5"
                                        />
                                    </>
                                ) : (
                                    <AddGameChoose
                                        onPickFile={() => void form.browseExecutable()}
                                        onRunInstaller={openInstallWizard}
                                        onSkipFile={() => form.setStep('review')}
                                    />
                                )}
                            </form>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
