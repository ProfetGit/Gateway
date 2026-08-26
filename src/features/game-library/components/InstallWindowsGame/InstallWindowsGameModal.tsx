import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useGameStore } from '../../game-store'
import { InstallSetupStep } from './InstallSetupStep'
import { InstallRunningStep } from './InstallRunningStep'
import { InstallPickStep } from './InstallPickStep'
import { useInstallWizard } from './use-install-wizard'

export function InstallWindowsGameModal() {
    const isOpen = useGameStore((s) => s.isInstallWizardOpen)
    const close = useGameStore((s) => s.closeInstallWizard)
    const wizard = useInstallWizard(isOpen, close)

    return (
        <AnimatePresence>
            {isOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        // Closing mid-install would orphan the installer, so the
                        // backdrop stops dismissing while it runs.
                        onClick={wizard.step === 'running' ? undefined : close}
                    />

                    <motion.div
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-50 w-full max-w-lg max-h-[85vh] flex flex-col"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        {/* No overflow-hidden: the name field's Steam suggestions drop
                            below the input and would be clipped by it. */}
                        <div className="flex flex-col min-h-0 bg-void-elevated border border-void-border rounded-xl shadow-void-float">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-void-border">
                                <h2 className="text-lg font-semibold text-text-primary">Install a Windows game</h2>
                                {wizard.step !== 'running' && (
                                    <motion.button
                                        onClick={close}
                                        aria-label="Close"
                                        className="p-1.5 text-text-muted hover:text-text-primary hover:bg-void-surface rounded transition-colors"
                                        whileHover={{ scale: 1.1 }}
                                        whileTap={{ scale: 0.9 }}
                                    >
                                        <X className="w-4 h-4" />
                                    </motion.button>
                                )}
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto p-6">
                                {wizard.step === 'setup' && (
                                    <InstallSetupStep
                                        installerPath={wizard.installerPath}
                                        title={wizard.title}
                                        setTitle={wizard.setTitle}
                                        prefixPath={wizard.prefixPath}
                                        prefixHasFiles={wizard.prefixHasFiles}
                                        protonPath={wizard.protonPath}
                                        setProtonPath={wizard.setProtonPath}
                                        protonBuilds={wizard.protonBuilds}
                                        onChooseInstaller={wizard.chooseInstaller}
                                        onEditPrefix={wizard.editPrefix}
                                        linkedAppId={wizard.linkedAppId}
                                        onLink={(hit) => wizard.setLinkedAppId(hit?.appId)}
                                    />
                                )}
                                {wizard.step === 'running' && <InstallRunningStep progress={wizard.progress} />}
                                {wizard.step === 'pick' && (
                                    <InstallPickStep
                                        candidates={wizard.candidates}
                                        chosen={wizard.chosen}
                                        setChosen={wizard.setChosen}
                                    />
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-void-border">
                                <p className="text-xs text-crimson-500 min-h-4 line-clamp-2">{wizard.error}</p>
                                <div className="shrink-0">
                                    {wizard.step === 'setup' && (
                                        <ActionButton
                                            label="Run Installer"
                                            disabled={!wizard.canRun}
                                            onClick={() => { void wizard.run() }}
                                        />
                                    )}
                                    {wizard.step === 'running' && (
                                        <button
                                            type="button"
                                            onClick={wizard.cancel}
                                            className="px-4 py-2 text-sm text-text-muted hover:text-crimson-400 transition-colors duration-100"
                                        >
                                            Stop
                                        </button>
                                    )}
                                    {wizard.step === 'pick' && (
                                        <ActionButton
                                            label="Add to Library"
                                            disabled={!wizard.chosen}
                                            onClick={() => { void wizard.finish() }}
                                        />
                                    )}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

function ActionButton({ label, disabled, onClick }: { label: string; disabled: boolean; onClick: () => void }) {
    return (
        <motion.button
            type="button"
            onClick={onClick}
            disabled={disabled}
            className="px-5 py-2 text-sm font-medium bg-crimson-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100"
            whileHover={{ scale: disabled ? 1 : 1.02 }}
            whileTap={{ scale: disabled ? 1 : 0.98 }}
        >
            {label}
        </motion.button>
    )
}
