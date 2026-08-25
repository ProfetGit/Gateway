import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight } from 'lucide-react'
import { steamLogin } from '@/features/auth/api/steam-login'

export type OnboardingSteamLoginStepProps = {
    onDone: (user: { username: string; avatarUrl: string }) => void
}

export function OnboardingSteamLoginStep({ onDone }: OnboardingSteamLoginStepProps) {
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
