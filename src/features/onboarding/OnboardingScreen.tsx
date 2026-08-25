import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/features/game-library/game-store'
import { markSetupComplete } from './api/mark-setup-complete'
import type { Game } from '@/features/game-library/game-library-types'
import { OnboardingSteamLoginStep } from './OnboardingSteamLoginStep'
import { OnboardingApiKeyStep } from './OnboardingApiKeyStep'
import { OnboardingSyncStep } from './OnboardingSyncStep'

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
                                <OnboardingSteamLoginStep
                                    onDone={(user) => {
                                        setSteamUser(user)
                                        setStep('apikey')
                                    }}
                                />
                            </motion.div>
                        )}
                        {step === 'apikey' && (
                            <motion.div key="apikey" {...SLIDE}>
                                <OnboardingApiKeyStep
                                    steamUser={steamUser}
                                    onDone={() => setStep('sync')}
                                    onSkip={() => setStep('sync')}
                                />
                            </motion.div>
                        )}
                        {step === 'sync' && (
                            <motion.div key="sync" {...SLIDE}>
                                <OnboardingSyncStep
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
