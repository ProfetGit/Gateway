import { useState, useEffect } from 'react'
import { RefreshCw, Download } from 'lucide-react'
import { onUpdateStatus } from './api/on-update-status'
import { checkForUpdates } from './api/check-for-updates'
import { installUpdate } from './api/install-update'
import type { UpdateStatus } from './api/update-schema'

function statusLabel(status: UpdateStatus): string {
    switch (status.state) {
        case 'checking':
            return 'Checking for updates…'
        case 'available':
            return `Version ${status.version} found, downloading…`
        case 'current':
            return "You're on the latest version"
        case 'downloading':
            return `Downloading… ${Math.round(status.percent)}%`
        case 'ready':
            return `Version ${status.version} is ready to install`
        case 'error':
            return `Couldn't check for updates — ${status.message}`
    }
}

export function AboutSection() {
    const [status, setStatus] = useState<UpdateStatus | null>(null)
    const [note, setNote] = useState<string | null>(null)

    useEffect(() => {
        let unlisten: (() => void) | undefined
        onUpdateStatus(setStatus).then((fn) => { unlisten = fn })
        return () => { unlisten?.() }
    }, [])

    const handleCheck = async () => {
        setNote(null)
        setStatus({ state: 'checking' })
        try {
            const result = await checkForUpdates()
            // Not packaged (i.e. running from source) — say so rather than
            // leaving the row stuck on "Checking…".
            if (!result.started) {
                setStatus(null)
                setNote(result.reason ?? 'Updates are unavailable here')
            }
        } catch (error) {
            setStatus({
                state: 'error',
                message: error instanceof Error ? error.message : 'Unknown problem',
            })
        }
    }

    return (
        <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-6 text-center">
                <div className="text-3xl font-display font-black italic tracking-tighter text-white uppercase mb-2 -skew-x-6">
                    Gateway
                </div>
                <div className="font-mono text-[11px] text-crimson-400 tracking-widest uppercase">
                    Version 1.0.0
                </div>
            </div>

            <div className="bg-white/[0.02] border border-white/10 p-4 space-y-3">
                <div className="flex items-center justify-between gap-4">
                    <div className="min-w-0">
                        <div className="font-mono text-xs uppercase tracking-widest font-bold text-white/80">
                            Updates
                        </div>
                        <p className="font-mono text-[10px] text-white/40 mt-1 break-words">
                            {note ?? (status ? statusLabel(status) : 'Gateway updates itself in the background')}
                        </p>
                    </div>

                    <button
                        onClick={handleCheck}
                        disabled={status?.state === 'checking' || status?.state === 'downloading'}
                        className="shrink-0 px-3 py-2 border border-white/15 enabled:hover:border-crimson-500/50 enabled:hover:text-crimson-300 text-white/70 font-mono text-[10px] uppercase tracking-widest font-bold transition-colors duration-100 flex items-center gap-1.5 disabled:opacity-30"
                    >
                        <RefreshCw
                            className={`w-3 h-3 ${status?.state === 'checking' ? 'animate-spin' : ''}`}
                        />
                        Check
                    </button>
                </div>

                {status?.state === 'ready' && (
                    <button
                        onClick={() => installUpdate()}
                        className="w-full px-3 py-2 bg-crimson-600 border border-crimson-500 hover:bg-crimson-500 text-white font-display font-black italic tracking-wider uppercase text-sm transition-colors duration-100 flex items-center justify-center gap-2"
                    >
                        <Download className="w-4 h-4" />
                        Restart and install
                    </button>
                )}
            </div>
        </div>
    )
}
