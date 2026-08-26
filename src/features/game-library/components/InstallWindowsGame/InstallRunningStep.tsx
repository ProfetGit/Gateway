import { motion } from 'framer-motion'
import type { InstallerProgress } from '../../api/launch-schema'

const HEADLINE: Record<InstallerProgress['state'], string> = {
    preparing: 'Setting up the game folder',
    running: 'Installer is open',
    scanning: 'Looking for the game',
    done: 'Finished',
    failed: 'Something went wrong',
    cancelled: 'Stopped',
}

export function InstallRunningStep({ progress }: { progress: InstallerProgress | null }) {
    const state = progress?.state ?? 'preparing'

    return (
        <div className="py-6 space-y-5">
            <div>
                <h3 className="font-display font-bold text-white">{HEADLINE[state]}</h3>
                <p className="text-sm text-text-muted mt-1">
                    {state === 'running'
                        ? 'Work through the installer in the window that opened. Gateway waits for it to finish.'
                        : 'This can take a minute the first time.'}
                </p>
            </div>

            {/* scaleX, so nothing lays out while it animates */}
            <div className="h-0.5 bg-void-surface overflow-hidden">
                <motion.div
                    className="h-full bg-crimson-500 origin-left"
                    animate={{ scaleX: [0.05, 1, 0.05], x: ['0%', '0%', '100%'] }}
                    transition={{ duration: 1.8, repeat: Infinity, ease: 'easeInOut' }}
                />
            </div>

            {progress?.message && (
                <p className="font-mono text-[11px] text-text-ghost break-all line-clamp-3">
                    {progress.message}
                </p>
            )}
        </div>
    )
}
