import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Check } from 'lucide-react'
import { syncSteam } from '@/features/game-library/api/sync-steam'
import type { Game } from '@/features/game-library/game-library-types'

export type OnboardingSyncStepProps = {
    gameCount: number | null
    setGameCount: (n: number) => void
    setGames: (games: Game[]) => void
    onDone: () => void
}

export function OnboardingSyncStep({ gameCount, setGameCount, setGames, onDone }: OnboardingSyncStepProps) {
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
