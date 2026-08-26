import { Check } from 'lucide-react'
import { selectExecutable } from '@/lib/api/file-dialogs'
import type { RankedExecutable } from '../../api/launch-schema'

function formatSize(bytes: number): string {
    const mb = bytes / (1024 * 1024)
    return mb >= 1024 ? `${(mb / 1024).toFixed(1)} GB` : `${Math.max(1, Math.round(mb))} MB`
}

interface InstallPickStepProps {
    candidates: RankedExecutable[]
    chosen: string
    setChosen: (path: string) => void
}

export function InstallPickStep({ candidates, chosen, setChosen }: InstallPickStepProps) {
    const browse = async () => {
        const path = await selectExecutable()
        if (path) setChosen(path)
    }

    const isCustom = Boolean(chosen) && !candidates.some((c) => c.path === chosen)

    return (
        <div className="space-y-4">
            <p className="text-sm text-text-muted">
                {candidates.length === 1
                    ? 'This is what the installer left behind.'
                    : 'Pick the file that starts the game. The most likely one is selected.'}
            </p>

            <div className="space-y-1.5 max-h-72 overflow-y-auto">
                {candidates.map((candidate) => (
                    <button
                        key={candidate.path}
                        type="button"
                        onClick={() => setChosen(candidate.path)}
                        className={`w-full flex items-center gap-3 p-3 text-left border transition-colors duration-100 ${
                            chosen === candidate.path
                                ? 'border-crimson-500/60 bg-crimson-500/10'
                                : 'border-void-border bg-void-surface hover:border-void-border/80'
                        }`}
                    >
                        <span className={`w-4 h-4 shrink-0 border flex items-center justify-center ${
                            chosen === candidate.path ? 'border-crimson-500 bg-crimson-500' : 'border-void-border'
                        }`}>
                            {chosen === candidate.path && <Check className="w-3 h-3 text-white" />}
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm text-text-primary truncate">{candidate.name}</span>
                            <span className="block font-mono text-[11px] text-text-ghost truncate">{candidate.path}</span>
                        </span>
                        <span className="font-mono text-[11px] text-text-muted shrink-0">
                            {formatSize(candidate.size)}
                        </span>
                    </button>
                ))}
            </div>

            <button
                type="button"
                onClick={() => { void browse() }}
                className="text-xs font-mono uppercase tracking-widest text-text-muted hover:text-text-primary transition-colors duration-100"
            >
                {isCustom ? `Chosen: ${chosen}` : 'None of these — pick the file myself'}
            </button>
        </div>
    )
}
