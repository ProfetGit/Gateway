import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Check, KeyRound, Gamepad2, ExternalLink, Loader2, ArrowRight } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'

interface SetupState {
    hasCompletedSetup: boolean
    hasApiKey: boolean
    isSteamLoggedIn: boolean
    hasGames: boolean
}

export function SetupWizard() {
    const isOpen = useGameStore((s) => s.isSetupWizardOpen)
    const closeWizard = useGameStore((s) => s.closeSetupWizard)

    const [state, setState] = React.useState<SetupState | null>(null)
    const [busy, setBusy] = React.useState(false)
    const [syncError, setSyncError] = React.useState<string | null>(null)

    // Refresh setup state whenever wizard opens, OR after each action.
    const refreshState = React.useCallback(async () => {
        const next = await window.api?.getSetupState()
        if (next) setState(next)
    }, [])

    React.useEffect(() => {
        if (!isOpen) return
        refreshState()
        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') handleDismiss()
        }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [isOpen, refreshState])

    const handleDismiss = async () => {
        // Persist completion so it never auto-opens again, even if user skips.
        await window.api?.markSetupComplete()
        closeWizard()
    }

    const handleConnectSteam = async () => {
        setBusy(true)
        try {
            await window.api?.steamLogin()
            await refreshState()
        } finally {
            setBusy(false)
        }
    }

    const handleSyncLibrary = async () => {
        setBusy(true)
        setSyncError(null)
        try {
            const games = await window.api?.syncSteam()
            if (games && games.length > 0) {
                useGameStore.getState().setGames(games)
            } else if (games && games.length === 0) {
                setSyncError("No games found — make sure your Steam library isn't empty")
            }
            await refreshState()
        } catch (err) {
            console.error('[SetupWizard] sync failed:', err)
            setSyncError(err instanceof Error ? err.message : 'Could not load your games')
        } finally {
            setBusy(false)
        }
    }

    return (
        <AnimatePresence>
            {isOpen && state && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-void-pure/85 backdrop-blur-md z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                    />

                    <div className="fixed inset-0 z-50 flex items-center justify-center p-8 pointer-events-none">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 24 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 24 }}
                            transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                            className="pointer-events-auto relative w-full max-w-2xl bg-void-deep border border-white/10 shadow-[0_30px_80px_oklch(0_0_0/0.7)] overflow-hidden"
                        >
                            {/* Texture overlays */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0)_3px)] opacity-[0.08] pointer-events-none" />

                            {/* Header */}
                            <div className="relative px-8 pt-8 pb-6 border-b border-white/10 z-10">
                                <button
                                    onClick={handleDismiss}
                                    aria-label="Skip setup"
                                    className="absolute top-6 right-6 group p-2 border border-white/10 hover:border-crimson-500/50 hover:bg-white/5 transition-colors duration-200"
                                >
                                    <X className="w-4 h-4 text-white/60 group-hover:text-crimson-500 transition-colors" />
                                </button>

                                <div className="flex items-center gap-2 text-crimson-500 mb-2">
                                    <div className="w-2 h-2 bg-crimson-500 rounded-full animate-pulse" />
                                    <span className="font-mono text-[10px] tracking-[0.25em] uppercase">Welcome</span>
                                </div>
                                <h2 className="text-3xl font-display font-black text-white italic tracking-tighter uppercase transform -skew-x-6 mb-2">
                                    Welcome to Gateway
                                    <span className="text-white/20 ml-2">///</span>
                                </h2>
                                <p className="text-sm text-white/60 leading-relaxed max-w-lg">
                                    Sign in to Steam to load your games. The key field below is only needed if your Steam profile is private and you'd rather not sign in here.
                                </p>
                            </div>

                            {/* Cards */}
                            <div className="relative px-8 py-6 space-y-3 z-10">
                                <SetupCard
                                    step={1}
                                    icon={<Gamepad2 className="w-5 h-5" />}
                                    title="Sign in to Steam"
                                    description="Opens Steam's login page in a window. After login, Gateway reads your owned games and achievement progress — no extra key needed."
                                    status={state.isSteamLoggedIn ? 'done' : 'pending'}
                                    actionLabel={state.isSteamLoggedIn ? 'Connected' : 'Sign in'}
                                    onAction={handleConnectSteam}
                                    disabled={busy || state.isSteamLoggedIn}
                                />

                                <SetupCard
                                    step={2}
                                    icon={<KeyRound className="w-5 h-5" />}
                                    title="Steam key (optional)"
                                    description="Only needed if your Steam profile is private and you don't want to sign in. With Step 1 done, most people can skip this."
                                    status={state.hasApiKey ? 'done' : 'pending'}
                                    expandable
                                    onChange={refreshState}
                                />

                                <SetupCard
                                    step={3}
                                    icon={<ArrowRight className="w-5 h-5" />}
                                    title="Load your games"
                                    description="Find your installed Steam games and load the cover art. Needs Steam to be signed in."
                                    status={state.hasGames ? 'done' : 'pending'}
                                    actionLabel={state.hasGames ? 'Done' : 'Load now'}
                                    onAction={handleSyncLibrary}
                                    disabled={busy || !state.isSteamLoggedIn || state.hasGames}
                                />

                                {syncError && (
                                    <div className="px-3 py-2 border border-red-500/40 bg-red-500/5 text-[11px] font-mono text-red-300 uppercase tracking-wider">
                                        {syncError}
                                    </div>
                                )}
                            </div>

                            {/* Footer */}
                            <div className="relative px-8 py-5 border-t border-white/10 flex items-center justify-between z-10">
                                <span className="text-[10px] font-mono text-white/30 uppercase tracking-widest">
                                    Find this again in Settings
                                </span>
                                <button
                                    onClick={handleDismiss}
                                    className="group flex items-center gap-2 px-5 py-2.5 bg-crimson-600 hover:bg-crimson-500 text-white text-sm font-display font-black uppercase tracking-wider italic transition-colors duration-200"
                                >
                                    Continue
                                    <ArrowRight className="w-4 h-4 transition-transform duration-200 group-hover:translate-x-0.5" />
                                </button>
                            </div>
                        </motion.div>
                    </div>
                </>
            )}
        </AnimatePresence>
    )
}

// ═══════════════════════════════════════════════════════════
// SetupCard — one step in the wizard
// ═══════════════════════════════════════════════════════════

interface SetupCardProps {
    step: number
    icon: React.ReactNode
    title: string
    description: string
    status: 'done' | 'pending'
    actionLabel?: string
    onAction?: () => void | Promise<void>
    disabled?: boolean
    expandable?: boolean      // For API key card — needs inline input
    onChange?: () => void     // Called after API key save so parent can refresh state
}

function SetupCard({ step, icon, title, description, status, actionLabel, onAction, disabled, expandable, onChange }: SetupCardProps) {
    const isDone = status === 'done'

    return (
        <div
            className={`
                relative border transition-colors duration-200
                ${isDone
                    ? 'bg-emerald-500/5 border-emerald-500/30'
                    : 'bg-void-surface border-white/10 hover:border-white/25'
                }
            `}
        >
            <div className="flex items-start gap-4 p-4">
                {/* Step number + icon */}
                <div className="shrink-0 flex flex-col items-center gap-1">
                    <span className={`text-[10px] font-mono font-bold tracking-widest ${isDone ? 'text-emerald-500/60' : 'text-white/30'}`}>
                        0{step}
                    </span>
                    <div className={`w-10 h-10 flex items-center justify-center border ${isDone ? 'border-emerald-500/40 text-emerald-400' : 'border-white/15 text-white/60'}`}>
                        {isDone ? <Check className="w-5 h-5" /> : icon}
                    </div>
                </div>

                {/* Title + description */}
                <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                        <h3 className="text-sm font-display font-bold uppercase tracking-wider text-white">
                            {title}
                        </h3>
                        {isDone && (
                            <span className="text-[9px] font-mono font-black uppercase tracking-widest text-emerald-400 px-1.5 py-0.5 border border-emerald-500/40 bg-emerald-500/10">
                                Done
                            </span>
                        )}
                    </div>
                    <p className="text-xs text-white/55 leading-relaxed">
                        {description}
                    </p>

                    {/* Inline expandable area for API key entry */}
                    {expandable && !isDone && (
                        <ApiKeyInput onSaved={onChange} />
                    )}
                </div>

                {/* Action button */}
                {!expandable && actionLabel && (
                    <button
                        onClick={onAction}
                        disabled={disabled}
                        className={`
                            shrink-0 px-4 py-2 text-xs font-mono font-bold uppercase tracking-widest
                            border transition-[color,border-color,background-color,opacity] duration-200
                            ${isDone
                                ? 'border-emerald-500/30 text-emerald-400/70 cursor-default'
                                : disabled
                                    ? 'border-white/10 text-white/30 cursor-not-allowed'
                                    : 'border-crimson-500/50 text-crimson-300 hover:bg-crimson-500/10 hover:border-crimson-500 cursor-pointer'
                            }
                        `}
                    >
                        {actionLabel}
                    </button>
                )}
            </div>
        </div>
    )
}

// ═══════════════════════════════════════════════════════════
// Inline API key input — used inside the expandable card
// ═══════════════════════════════════════════════════════════

function ApiKeyInput({ onSaved }: { onSaved?: () => void }) {
    const [value, setValue] = React.useState('')
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const handleSave = async () => {
        const trimmed = value.trim()
        if (!trimmed) {
            setError('Paste a key first')
            return
        }
        if (!/^[A-F0-9]{32}$/i.test(trimmed)) {
            setError('Keys are 32 hex characters')
            return
        }
        setSaving(true)
        setError(null)
        try {
            const result = await window.api?.setSteamApiKey(trimmed)
            if (result?.success) {
                setValue('')
                onSaved?.()
            } else {
                setError('Failed to save key')
            }
        } catch {
            setError('Failed to save key')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="mt-3 space-y-2">
            <div className="flex items-center gap-2">
                <input
                    type="password"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError(null) }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                    placeholder="Paste your key"
                    className="flex-1 px-3 py-2 bg-void-pure border border-white/15 focus:border-crimson-500/60 focus:outline-none text-xs font-mono text-white placeholder:text-white/25 tracking-wider"
                />
                <button
                    onClick={handleSave}
                    disabled={saving}
                    className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest border border-crimson-500/50 text-crimson-300 hover:bg-crimson-500/10 hover:border-crimson-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-200 flex items-center gap-1.5"
                >
                    {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                    Save
                </button>
            </div>
            <div className="flex items-center justify-between text-[10px] font-mono">
                {error ? (
                    <span className="text-red-400 uppercase tracking-widest">{error}</span>
                ) : (
                    <button
                        onClick={() => window.api?.openUrl('https://steamcommunity.com/dev/apikey')}
                        className="text-white/40 hover:text-crimson-300 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                    >
                        Get a key from Steam
                        <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                )}
            </div>
        </div>
    )
}

