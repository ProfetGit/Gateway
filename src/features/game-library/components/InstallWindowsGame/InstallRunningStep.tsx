import type { InstallerProgress } from '../../api/launch-schema'

const HEADLINE: Record<InstallerProgress['state'], string> = {
    preparing: 'Setting up the game folder',
    running: 'Installer is open',
    scanning: 'Looking for the game',
    done: 'Finished',
    failed: 'Something went wrong',
    cancelled: 'Stopped',
}

const DETAIL: Partial<Record<InstallerProgress['state'], string>> = {
    running: 'Work through the installer in the window that opened. Gateway waits for it to finish.',
    scanning: 'Comparing the folder against how it looked before.',
}

export function InstallRunningStep({ progress }: { progress: InstallerProgress | null }) {
    const state = progress?.state ?? 'preparing'
    const settled = state === 'done' || state === 'failed' || state === 'cancelled'

    return (
        <div className="py-4">
            <h3 className="font-display font-black italic text-lg tracking-[-0.02em] text-white">
                {HEADLINE[state]}
            </h3>
            <p className="mt-1.5 text-[13px] leading-relaxed text-white/50">
                {DETAIL[state] ?? 'This can take a minute the first time.'}
            </p>

            {/* Indeterminate: a highlight travelling across a static rail. The old
                version animated scaleX and x together, which read as a glitch
                rather than progress. Nothing here animates layout. */}
            <div className="relative mt-6 h-[3px] overflow-hidden bg-void-border/60">
                {settled ? (
                    <span
                        className={`absolute inset-0 origin-left ${state === 'done' ? 'bg-emerald-500' : 'bg-crimson-500'}`}
                    />
                ) : (
                    <span className="absolute inset-y-0 left-0 w-1/3 bg-crimson-500 shadow-[0_0_10px_oklch(0.58_0.245_25/0.6)] animate-[install-sweep_1.5s_ease-in-out_infinite]" />
                )}
            </div>

            {progress?.message && (
                <p className="mt-4 font-mono text-[11px] leading-relaxed text-white/30 break-all line-clamp-3">
                    {progress.message}
                </p>
            )}
        </div>
    )
}
