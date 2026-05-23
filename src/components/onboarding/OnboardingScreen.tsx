import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ExternalLink, Loader2, Check, ArrowRight, KeyRound } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { steamLogin, setSteamApiKey, openUrl, syncSteam, markSetupComplete } from '../../lib/api'
import type { Game } from '../../types/game'

interface Props {
    onComplete: () => void
}

type Step = 'steam' | 'apikey' | 'sync'

const EASE_OUT_EXPO = [0.16, 1, 0.3, 1] as const
const EASE_IN = [0.4, 0, 1, 1] as const

const SLIDE = {
    initial: { opacity: 0, y: 32 },
    animate: { opacity: 1, y: 0, transition: { duration: 0.4, ease: EASE_OUT_EXPO } },
    exit: { opacity: 0, y: -24, transition: { duration: 0.25, ease: EASE_IN } },
}

export function OnboardingScreen({ onComplete }: Props) {
    const [step, setStep] = React.useState<Step>('steam')
    const [steamUser, setSteamUser] = React.useState<{ username: string; avatarUrl: string } | null>(null)
    const [gameCount, setGameCount] = React.useState<number | null>(null)
    const setGames = useGameStore((s) => s.setGames) as (games: Game[]) => void

    return (
        <div className="fixed inset-0 z-[100] bg-void-pure flex flex-col overflow-hidden">
            {/* Scanlines */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0)_3px)] opacity-[0.06] pointer-events-none" />
            {/* Crimson floor glow */}
            <div
                className="absolute inset-0 pointer-events-none"
                style={{
                    background: 'radial-gradient(ellipse 70% 35% at 50% 100%, oklch(0.45 0.25 15 / 0.18), transparent)',
                }}
            />

            {/* Top bar */}
            <div className="relative z-10 flex items-center justify-between px-8 pt-6 pb-0 shrink-0">
                <span className="font-display font-black text-lg italic tracking-tighter text-white uppercase">
                    Gateway
                    <span className="text-crimson-500 ml-1">.</span>
                </span>
                <ProgressDots step={step} />
            </div>

            {/* Center content */}
            <div className="relative z-10 flex-1 flex items-center justify-center px-8">
                <div className="w-full max-w-sm">
                    <AnimatePresence mode="wait">
                        {step === 'steam' && (
                            <motion.div key="steam" {...SLIDE}>
                                <SteamStep
                                    onDone={(user) => {
                                        setSteamUser(user)
                                        setStep('apikey')
                                    }}
                                />
                            </motion.div>
                        )}
                        {step === 'apikey' && (
                            <motion.div key="apikey" {...SLIDE}>
                                <ApiKeyStep
                                    steamUser={steamUser}
                                    onDone={() => setStep('sync')}
                                    onSkip={() => setStep('sync')}
                                />
                            </motion.div>
                        )}
                        {step === 'sync' && (
                            <motion.div key="sync" {...SLIDE}>
                                <SyncStep
                                    gameCount={gameCount}
                                    setGameCount={setGameCount}
                                    setGames={setGames}
                                    onDone={async () => {
                                        await markSetupComplete()
                                        onComplete()
                                    }}
                                />
                            </motion.div>
                        )}
                    </AnimatePresence>
                </div>
            </div>

            {/* Bottom watermark */}
            <div className="relative z-10 pb-6 flex justify-center shrink-0">
                <span className="text-[10px] font-mono text-white/15 uppercase tracking-[0.3em]">
                    Your games. Your way.
                </span>
            </div>
        </div>
    )
}

// ─── Progress dots ───────────────────────────────────────────

function ProgressDots({ step }: { step: Step }) {
    const steps: Step[] = ['steam', 'apikey', 'sync']
    const idx = steps.indexOf(step)
    return (
        <div className="flex items-center gap-2">
            {steps.map((s, i) => (
                <div
                    key={s}
                    className={`h-1 transition-all duration-300 ease-out-expo ${
                        i < idx
                            ? 'w-6 bg-crimson-500'
                            : i === idx
                            ? 'w-6 bg-white/80'
                            : 'w-3 bg-white/20'
                    }`}
                />
            ))}
        </div>
    )
}

// ─── Step 1: Steam sign-in ────────────────────────────────────

function SteamStep({ onDone }: { onDone: (user: { username: string; avatarUrl: string }) => void }) {
    const [state, setState] = React.useState<'idle' | 'waiting' | 'error'>('idle')
    const [error, setError] = React.useState<string | null>(null)

    const handleSignIn = async () => {
        setState('waiting')
        setError(null)
        try {
            const auth = await steamLogin()
            if (auth?.isLoggedIn && auth.user) {
                onDone({ username: auth.user.username, avatarUrl: auth.user.avatarUrl })
            } else {
                setError('Sign-in did not complete. Try again.')
                setState('error')
            }
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Something went wrong')
            setState('error')
        }
    }

    const handleCancel = () => setState('idle')

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[10px] font-mono text-crimson-500 uppercase tracking-[0.3em] mb-3">Step 1 of 3</p>
                <h1 className="text-4xl font-display font-black italic tracking-tighter uppercase text-white leading-none mb-4">
                    Sign in<br />to Steam
                </h1>
                <p className="text-sm text-white/55 leading-relaxed">
                    {state === 'waiting'
                        ? 'Your browser just opened. Sign in to Steam and come back here.'
                        : "Opens your browser. Sign in and Gateway handles the rest — no extra steps."}
                </p>
            </div>

            <AnimatePresence mode="wait">
                {state === 'waiting' ? (
                    <motion.div
                        key="waiting"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        <div className="flex items-center gap-3 px-4 py-3 border border-white/10 bg-void-surface">
                            <span className="relative flex h-2 w-2 shrink-0">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-crimson-400 opacity-75" />
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-crimson-500" />
                            </span>
                            <span className="text-xs font-mono text-white/60 uppercase tracking-widest">
                                Waiting for browser…
                            </span>
                        </div>
                        <button
                            onClick={handleCancel}
                            className="text-xs font-mono text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors duration-100"
                        >
                            Cancel
                        </button>
                    </motion.div>
                ) : (
                    <motion.div
                        key="idle"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                    >
                        <button
                            onClick={handleSignIn}
                            className="group w-full flex items-center justify-between px-5 py-3.5 bg-crimson-600 hover:bg-crimson-500 transition-colors duration-100 text-white font-display font-black text-sm uppercase italic tracking-wider"
                        >
                            Open Steam
                            <ArrowRight className="w-4 h-4 transition-transform duration-100 group-hover:translate-x-0.5" />
                        </button>
                        {error && (
                            <p className="text-[11px] font-mono text-red-400 uppercase tracking-widest">{error}</p>
                        )}
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

// ─── Step 2: API key ─────────────────────────────────────────

function ApiKeyStep({
    steamUser,
    onDone,
    onSkip,
}: {
    steamUser: { username: string; avatarUrl: string } | null
    onDone: () => void
    onSkip: () => void
}) {
    const [value, setValue] = React.useState('')
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const handleSave = async () => {
        const trimmed = value.trim()
        if (!trimmed) { setError('Paste a key first'); return }
        if (!/^[A-F0-9]{32}$/i.test(trimmed)) { setError('Keys are 32 hex characters'); return }
        setSaving(true)
        setError(null)
        try {
            const result = await setSteamApiKey(trimmed)
            if (result?.success) {
                onDone()
            } else {
                setError(result?.error ?? 'Failed to save key')
            }
        } catch {
            setError('Failed to save key')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[10px] font-mono text-crimson-500 uppercase tracking-[0.3em] mb-3">Step 2 of 3</p>
                <h1 className="text-4xl font-display font-black italic tracking-tighter uppercase text-white leading-none mb-4">
                    Steam<br />API key
                </h1>

                {steamUser && (
                    <div className="flex items-center gap-2.5 mb-4 px-3 py-2 border border-emerald-500/25 bg-emerald-500/5">
                        {steamUser.avatarUrl && (
                            <img src={steamUser.avatarUrl} alt="" className="w-7 h-7 rounded-sm shrink-0" />
                        )}
                        <div className="min-w-0">
                            <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Signed in as</p>
                            <p className="text-xs font-mono text-white truncate">{steamUser.username}</p>
                        </div>
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" />
                    </div>
                )}

                <p className="text-sm text-white/55 leading-relaxed">
                    Needed to load your games and achievements. Get one from Steam — it takes under a minute.
                </p>
            </div>

            <div className="space-y-3">
                <div className="flex items-stretch gap-2">
                    <input
                        type="password"
                        value={value}
                        onChange={(e) => { setValue(e.target.value); setError(null) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                        placeholder="Paste your key here"
                        className="flex-1 px-3 py-2.5 bg-void-surface border border-white/15 focus:border-crimson-500/60 focus:outline-none text-xs font-mono text-white placeholder:text-white/25 tracking-wider"
                    />
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest border border-crimson-500/50 text-crimson-300 hover:bg-crimson-500/10 hover:border-crimson-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100 flex items-center gap-1.5 shrink-0"
                    >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                        Save
                    </button>
                </div>

                {error && (
                    <p className="text-[11px] font-mono text-red-400 uppercase tracking-widest">{error}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                    <button
                        onClick={() => openUrl('https://steamcommunity.com/dev/apikey')}
                        className="text-[10px] font-mono text-white/35 hover:text-crimson-300 transition-colors duration-100 uppercase tracking-widest flex items-center gap-1.5"
                    >
                        Get a key from Steam
                        <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                    <button
                        onClick={onSkip}
                        className="text-[10px] font-mono text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors duration-100"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    )
}

// ─── Step 3: Sync ─────────────────────────────────────────────

function SyncStep({
    gameCount,
    setGameCount,
    setGames,
    onDone,
}: {
    gameCount: number | null
    setGameCount: (n: number) => void
    setGames: (games: Game[]) => void
    onDone: () => void
}) {
    const [syncing, setSyncing] = React.useState(true)
    const [error, setError] = React.useState<string | null>(null)

    React.useEffect(() => {
        let cancelled = false
        const run = async () => {
            try {
                const games = await syncSteam()
                if (cancelled) return
                if (games && games.length > 0) {
                    setGames(games)
                    setGameCount(games.length)
                } else {
                    setGameCount(0)
                }
            } catch (err) {
                if (!cancelled) {
                    setError(err instanceof Error ? err.message : 'Could not load your games')
                }
            } finally {
                if (!cancelled) setSyncing(false)
            }
        }
        run()
        return () => { cancelled = true }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [])

    const handleRetry = () => {
        setSyncing(true)
        setError(null)
        setGameCount(0)
        syncSteam().then((games) => {
            if (games && games.length > 0) {
                setGames(games)
                setGameCount(games.length)
            } else {
                setGameCount(0)
            }
        }).catch((err: unknown) => {
            setError(err instanceof Error ? err.message : 'Could not load your games')
        }).finally(() => setSyncing(false))
    }

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[10px] font-mono text-crimson-500 uppercase tracking-[0.3em] mb-3">Step 3 of 3</p>
                <h1 className="text-4xl font-display font-black italic tracking-tighter uppercase text-white leading-none mb-4">
                    Loading<br />your games
                </h1>
                <p className="text-sm text-white/55 leading-relaxed">
                    {syncing
                        ? 'Finding your Steam library and cover art…'
                        : error
                        ? 'Something went wrong loading your games.'
                        : gameCount === 0
                        ? "No games found — check your Steam library."
                        : `Found ${gameCount} game${gameCount === 1 ? '' : 's'} in your library.`}
                </p>
            </div>

            <AnimatePresence mode="wait">
                {syncing ? (
                    <motion.div
                        key="loading"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                    >
                        <SyncSkeleton />
                        <SyncSkeleton opacity="opacity-60" />
                        <SyncSkeleton opacity="opacity-30" />
                    </motion.div>
                ) : error ? (
                    <motion.div
                        key="error"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-3"
                    >
                        <p className="text-[11px] font-mono text-red-400 uppercase tracking-widest">{error}</p>
                        <button
                            onClick={handleRetry}
                            className="text-xs font-mono text-white/40 hover:text-white/80 uppercase tracking-widest transition-colors duration-100"
                        >
                            Try again
                        </button>
                        <EnterButton onDone={onDone} />
                    </motion.div>
                ) : (
                    <motion.div
                        key="done"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="space-y-4"
                    >
                        {gameCount !== null && gameCount > 0 && (
                            <div className="flex items-center gap-3 px-4 py-3 border border-emerald-500/25 bg-emerald-500/5">
                                <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                                <span className="text-xs font-mono text-white/70 uppercase tracking-widest">
                                    {gameCount} game{gameCount === 1 ? '' : 's'} ready
                                </span>
                            </div>
                        )}
                        <EnterButton onDone={onDone} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}

function SyncSkeleton({ opacity = 'opacity-100' }: { opacity?: string }) {
    return (
        <div className={`h-10 bg-void-surface border border-white/5 animate-pulse ${opacity}`} />
    )
}

function EnterButton({ onDone }: { onDone: () => void }) {
    return (
        <button
            onClick={onDone}
            className="group w-full flex items-center justify-between px-5 py-3.5 bg-crimson-600 hover:bg-crimson-500 transition-colors duration-100 text-white font-display font-black text-sm uppercase italic tracking-wider"
        >
            Enter Gateway
            <ArrowRight className="w-4 h-4 transition-transform duration-100 group-hover:translate-x-0.5" />
        </button>
    )
}
