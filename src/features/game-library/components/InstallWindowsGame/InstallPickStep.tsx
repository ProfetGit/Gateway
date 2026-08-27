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
    const isCustom = Boolean(chosen) && !candidates.some((c) => c.path === chosen)

    return (
        <div>
            <p className="text-[13px] leading-relaxed text-white/55">
                {candidates.length === 1
                    ? 'This is what the installer left behind.'
                    : 'Pick the file that starts the game. The most likely one is already selected.'}
            </p>

            <div className="mt-4 space-y-1.5 max-h-72 overflow-y-auto [scrollbar-gutter:stable]">
                {candidates.map((candidate, index) => {
                    const selected = chosen === candidate.path
                    return (
                        <button
                            key={candidate.path}
                            type="button"
                            onClick={() => setChosen(candidate.path)}
                            className={`group w-full flex items-center gap-3 p-3 text-left border transition-[border-color,background-color,transform] duration-100 ease-out-expo hover:-translate-y-[2px] ${
                                selected
                                    ? 'border-crimson-500/60 bg-crimson-500/10'
                                    : 'border-void-border bg-void-deep hover:border-crimson-500/50'
                            }`}
                        >
                            <span className={`w-4 h-4 shrink-0 flex items-center justify-center border transition-colors duration-100 ease-out-expo ${
                                selected ? 'border-crimson-500 bg-crimson-500' : 'border-void-border group-hover:border-crimson-500/60'
                            }`}>
                                {selected && <Check className="w-3 h-3 text-white" />}
                            </span>

                            <span className="min-w-0 flex-1">
                                <span className="flex items-center gap-2">
                                    <span className="text-sm font-bold text-white truncate">{candidate.name}</span>
                                    {index === 0 && (
                                        <span className="shrink-0 px-1.5 py-0.5 text-[8px] font-mono font-black uppercase tracking-[0.14em] text-crimson-300 border border-crimson-500/40">
                                            Best guess
                                        </span>
                                    )}
                                </span>
                                <span dir="rtl" className="block mt-0.5 text-left font-mono text-[11px] text-white/35 truncate">
                                    <bdi>{candidate.path}</bdi>
                                </span>
                            </span>

                            <span className="shrink-0 font-mono text-[11px] text-white/40">{formatSize(candidate.size)}</span>
                        </button>
                    )
                })}
            </div>

            <button
                type="button"
                onClick={async () => {
                    const path = await selectExecutable()
                    if (path) setChosen(path)
                }}
                className="mt-4 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/40 hover:text-white border-b border-transparent hover:border-crimson-500 transition-[color,border-color] duration-100 ease-out-expo"
            >
                {isCustom ? 'Chosen a file myself — change it' : 'None of these — pick the file myself'}
            </button>

            {isCustom && (
                <p dir="rtl" className="mt-2 text-left font-mono text-[11px] text-white/45 truncate" title={chosen}>
                    <bdi>{chosen}</bdi>
                </p>
            )}
        </div>
    )
}
