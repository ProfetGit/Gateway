import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { X } from 'lucide-react'
import { ActionStrip } from '@/components/ui/ActionStrip'
import { CornerBrackets } from '@/components/ui/CornerBrackets'
import { useGameStore } from '../../game-store'
import { useSteamAutoMatch } from '../../use-steam-auto-match'
import { InstallSetupStep } from './InstallSetupStep'
import { InstallRunningStep } from './InstallRunningStep'
import { InstallPickStep } from './InstallPickStep'
import { InstallFailedStep } from './InstallFailedStep'
import { useInstallWizard } from './use-install-wizard'

const STEP_LABEL: Record<string, string> = {
    setup: 'Step 1 of 3',
    running: 'Step 2 of 3 · leave this open',
    pick: 'Step 3 of 3 · which file starts it?',
    failed: "Step 2 of 3 · didn't work",
}

export function InstallWindowsGameModal() {
    const isOpen = useGameStore((s) => s.isInstallWizardOpen)
    const close = useGameStore((s) => s.closeInstallWizard)
    const wizard = useInstallWizard(isOpen, close)
    const match = useSteamAutoMatch(wizard.title, isOpen && wizard.step === 'setup')

    // The wizard resets itself on open; the matcher has to as well, or a match
    // the user picked by hand last time keeps its lookup switched off for the
    // next game.
    const resetMatch = match.reset
    useEffect(() => { if (isOpen) resetMatch() }, [isOpen, resetMatch])

    // The wizard owns the appid it will pass to umu as GAMEID; the matcher owns
    // the hit the UI shows. Keeping them in step here means the setup screen
    // never displays a link the install would not actually use.
    const linkMatch = (hit: Parameters<typeof match.chooseMatch>[0]) => {
        match.chooseMatch(hit)
        wizard.setLinkedAppId(hit?.appId)
        if (hit) wizard.setTitle(hit.name)
    }

    const editTitle = (next: string) => {
        wizard.setTitle(next)
        match.releaseMatch()
        wizard.setLinkedAppId(undefined)
    }

    const heading = wizard.step === 'setup'
        ? (wizard.installerPath ? (wizard.title.trim() || 'Your game') : 'Install a Windows game')
        : wizard.title.trim() || 'Installing'

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 z-40 bg-void-pure/85 backdrop-blur-md"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        // Closing mid-install would orphan the installer.
                        onClick={wizard.step === 'running' ? undefined : close}
                    />

                    <motion.div
                        className="fixed left-1/2 top-1/2 z-50 w-full max-w-[620px] max-h-[85vh] -translate-x-1/2 -translate-y-1/2"
                        initial={{ opacity: 0, scale: 0.985, y: 14 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.99, y: 8 }}
                        transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* No overflow-hidden: nothing may clip the Steam suggestions. */}
                        <div className="relative flex flex-col max-h-[85vh] bg-void-pure border border-void-border shadow-void-float">
                            <CornerBrackets colorClass="border-crimson-500/70" size={26} thickness={2} />

                            <header className="flex items-start justify-between gap-4 px-6 pt-5 pb-4 border-b border-void-border shrink-0">
                                <div className="min-w-0">
                                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-crimson-400">
                                        {STEP_LABEL[wizard.step]}
                                    </p>
                                    <h2 className="mt-1.5 font-display font-black italic text-[22px] tracking-[-0.02em] text-white truncate">
                                        {heading}
                                    </h2>
                                </div>
                                {wizard.step !== 'running' && (
                                    <button
                                        type="button"
                                        onClick={close}
                                        aria-label="Close"
                                        className="w-[34px] h-[34px] shrink-0 flex items-center justify-center border border-void-border/70 text-white/40 hover:text-white hover:bg-crimson-600 hover:border-crimson-500 transition-colors duration-100 ease-out-expo"
                                    >
                                        <X className="w-4 h-4" />
                                    </button>
                                )}
                            </header>

                            <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] px-6 pt-5 pb-5">
                                {wizard.step === 'setup' && (
                                    <InstallSetupStep
                                        installerPath={wizard.installerPath}
                                        title={wizard.title}
                                        setTitle={editTitle}
                                        prefixPath={wizard.prefixPath}
                                        prefixHasFiles={wizard.prefixHasFiles}
                                        protonPath={wizard.protonPath}
                                        setProtonPath={wizard.setProtonPath}
                                        protonBuilds={wizard.protonBuilds}
                                        onChooseInstaller={wizard.chooseInstaller}
                                        onEditPrefix={wizard.editPrefix}
                                        linked={match.linked}
                                        suggestions={match.suggestions}
                                        isSearching={match.isSearching}
                                        onLink={linkMatch}
                                    />
                                )}
                                {wizard.step === 'running' && <InstallRunningStep progress={wizard.progress} />}
                                {wizard.step === 'failed' && (
                                    <InstallFailedStep
                                        error={wizard.error}
                                        protonBuilds={wizard.protonBuilds}
                                        triedProtonPath={wizard.triedProtonPath}
                                        prefixWasOurs={wizard.prefixWasOurs}
                                        onRetry={(protonPath, clean) => { void wizard.run(protonPath, clean) }}
                                        onPickManually={() => wizard.setStep('setup')}
                                    />
                                )}
                                {wizard.step === 'pick' && (
                                    <InstallPickStep
                                        candidates={wizard.candidates}
                                        chosen={wizard.chosen}
                                        setChosen={wizard.setChosen}
                                    />
                                )}
                            </div>

                            <footer className="shrink-0 px-6 pb-6">
                                {wizard.error && wizard.step !== 'failed' && (
                                    <p className="mb-3 text-xs leading-relaxed text-crimson-300 line-clamp-2">
                                        {wizard.error}
                                    </p>
                                )}

                                {wizard.step === 'setup' && (
                                    <ActionStrip
                                        label="Run the installer"
                                        disabled={!wizard.canRun}
                                        onClick={() => { void wizard.run() }}
                                    />
                                )}
                                {wizard.step === 'running' && (
                                    <button
                                        type="button"
                                        onClick={wizard.cancel}
                                        className="block mx-auto text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/35 hover:text-crimson-300 border-b border-transparent hover:border-crimson-500 transition-[color,border-color] duration-100 ease-out-expo"
                                    >
                                        Stop the installer
                                    </button>
                                )}
                                {wizard.step === 'pick' && (
                                    <ActionStrip
                                        label="Add to library"
                                        disabled={!wizard.chosen}
                                        onClick={() => { void wizard.finish() }}
                                    />
                                )}
                            </footer>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
