import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { useGameStore } from '../../game-store'
import { GamePropertiesGeneral } from './GamePropertiesGeneral'
import { GamePropertiesCompat } from './GamePropertiesCompat'
import { GamePropertiesTweaks } from './GamePropertiesTweaks'
import { useGamePropertiesForm } from './use-game-properties-form'
import { usesGatewayRuntime } from './game-properties-form-logic'

type PropertiesTab = 'general' | 'compatibility' | 'tweaks'

const TABS: { id: PropertiesTab; label: string }[] = [
    { id: 'general', label: 'General' },
    { id: 'compatibility', label: 'Compatibility' },
    { id: 'tweaks', label: 'Extras' },
]

export function GamePropertiesModal() {
    const isOpen = useGameStore((s) => s.isPropertiesOpen)
    const game = useGameStore((s) => s.propertiesGame)
    const closeProperties = useGameStore((s) => s.closeProperties)

    const [tab, setTab] = useState<PropertiesTab>('general')
    const form = useGamePropertiesForm(game, closeProperties)

    return (
        <AnimatePresence>
            {isOpen && game && form.draft && (
                <>
                    {/* Sits above GameDetail (z-50), which stays open behind it. */}
                    <motion.div
                        className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60]"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeProperties}
                    />

                    <motion.div
                        className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-[70] w-full max-w-xl max-h-[85vh] flex flex-col"
                        initial={{ opacity: 0, scale: 0.9, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 10 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="flex flex-col min-h-0 bg-void-elevated border border-void-border rounded-xl shadow-void-float overflow-hidden">
                            <div className="flex items-center justify-between px-6 py-4 border-b border-void-border">
                                <div className="min-w-0">
                                    <h2 className="text-lg font-semibold text-text-primary truncate">Properties</h2>
                                    <p className="text-xs font-mono text-text-muted uppercase tracking-wider truncate">{game.title}</p>
                                </div>
                                <motion.button
                                    onClick={closeProperties}
                                    aria-label="Close"
                                    className="p-1.5 text-text-muted hover:text-text-primary hover:bg-void-surface rounded transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X className="w-4 h-4" />
                                </motion.button>
                            </div>

                            <div className="flex gap-1 px-6 pt-4 border-b border-void-border">
                                {TABS.map(({ id, label }) => (
                                    <button
                                        key={id}
                                        type="button"
                                        onClick={() => setTab(id)}
                                        className={`relative px-3 py-2 text-xs font-mono uppercase tracking-wider transition-colors duration-100 ${
                                            tab === id ? 'text-text-primary' : 'text-text-muted hover:text-text-secondary'
                                        }`}
                                    >
                                        {label}
                                        {tab === id && (
                                            <motion.div
                                                layoutId="game-properties-tab-underline"
                                                className="absolute left-0 right-0 -bottom-px h-0.5 bg-crimson-500"
                                            />
                                        )}
                                    </button>
                                ))}
                            </div>

                            <div className="flex-1 min-h-0 overflow-y-auto p-6">
                                {tab === 'general' && (
                                    <GamePropertiesGeneral
                                        draft={form.draft}
                                        setField={form.setField}
                                        gameId={game.id}
                                        artAppId={game.steamAppId ?? game.metadataAppId}
                                    />
                                )}
                                {tab === 'compatibility' && (
                                    <GamePropertiesCompat
                                        draft={form.draft}
                                        setField={form.setField}
                                        protonBuilds={form.protonBuilds}
                                        editable={usesGatewayRuntime(game)}
                                    />
                                )}
                                {tab === 'tweaks' && (
                                    <GamePropertiesTweaks draft={form.draft} setField={form.setField} tools={form.tools} />
                                )}
                            </div>

                            <div className="flex items-center justify-between gap-4 px-6 py-4 border-t border-void-border">
                                <p className="text-xs text-crimson-500 min-h-4">{form.error}</p>
                                <div className="flex gap-2 shrink-0">
                                    <button
                                        type="button"
                                        onClick={closeProperties}
                                        className="px-4 py-2 text-sm text-text-muted hover:text-text-primary transition-colors duration-100"
                                    >
                                        Cancel
                                    </button>
                                    <motion.button
                                        type="button"
                                        onClick={() => { void form.save() }}
                                        disabled={!form.canSave || form.isSaving}
                                        className="px-5 py-2 text-sm font-medium bg-crimson-600 text-white rounded-lg disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100"
                                        whileHover={{ scale: form.canSave ? 1.02 : 1 }}
                                        whileTap={{ scale: form.canSave ? 0.98 : 1 }}
                                    >
                                        {form.isSaving ? 'Saving…' : 'Save'}
                                    </motion.button>
                                </div>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
