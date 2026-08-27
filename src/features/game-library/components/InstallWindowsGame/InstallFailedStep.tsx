import { useState } from 'react'
import { AlertTriangle, RotateCcw } from 'lucide-react'
import { protonRetryChoices } from '../../describe-proton-build'
import type { ProtonBuild } from '../../api/launch-schema'

export type InstallFailedStepProps = {
    error: string | null
    protonBuilds: ProtonBuild[]
    triedProtonPath: string
    /** Gateway created this folder and it was empty — safe to wipe on retry. */
    prefixWasOurs: boolean
    onRetry: (protonPath: string, cleanPrefix: boolean) => void
    onPickManually: () => void
}

/**
 * Where trying a different Proton belongs — after something went wrong, not on
 * the setup screen. Nobody knows in advance that an installer needs GE, and a
 * dropdown of build names asks a question no non-technical user can answer.
 * Here the choice has a reason behind it and each option is one click.
 */
export function InstallFailedStep({
    error, protonBuilds, triedProtonPath, prefixWasOurs, onRetry, onPickManually,
}: InstallFailedStepProps) {
    // Wine refuses to reuse a prefix built by a newer Proton, so a retry on an
    // older build needs the folder emptied first. Only offered as a default
    // when the folder is one Gateway made and found empty.
    const [clean, setClean] = useState(prefixWasOurs)
    const choices = protonRetryChoices(protonBuilds, triedProtonPath)

    return (
        <div>
            <div className="flex gap-3 p-3.5 border border-amber-500/40 bg-amber-500/5">
                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-amber-400" />
                <div className="min-w-0">
                    <p className="text-[13px] font-bold text-white">That didn't work</p>
                    <p className="mt-1 text-xs leading-relaxed text-white/55 break-words">
                        {error ?? 'The installer stopped before it finished.'}
                    </p>
                </div>
            </div>

            {choices.length > 0 ? (
                <>
                    <p className="mt-5 text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-crimson-400">
                        Try again with
                    </p>
                    <p className="mt-1.5 text-xs leading-relaxed text-white/45">
                        Games are picky about which Windows layer they run on. Trying another one fixes
                        most installers that refuse to start.
                    </p>

                    <div className="mt-3 space-y-1.5">
                        {choices.map((choice) => (
                            <button
                                key={choice.path || 'default'}
                                type="button"
                                onClick={() => onRetry(choice.path, clean)}
                                className="group w-full flex items-center gap-3 p-3 text-left bg-void-deep border border-void-border hover:border-crimson-500 hover:-translate-y-[2px] transition-[border-color,transform] duration-100 ease-out-expo"
                            >
                                <RotateCcw className="w-4 h-4 shrink-0 text-white/30 group-hover:text-crimson-400 transition-colors duration-100 ease-out-expo" />
                                <span className="min-w-0 flex-1">
                                    <span className="block text-sm font-bold text-white">{choice.label}</span>
                                    <span className="block mt-0.5 text-[11.5px] leading-snug text-white/45">{choice.blurb}</span>
                                </span>
                            </button>
                        ))}
                    </div>

                    <label className="flex items-start gap-2.5 mt-4 cursor-pointer select-none">
                        <input
                            type="checkbox"
                            checked={clean}
                            onChange={(e) => setClean(e.target.checked)}
                            className="mt-0.5 w-3.5 h-3.5 accent-crimson-600"
                        />
                        <span className="text-[11.5px] leading-snug text-white/50">
                            Start with an empty game folder.
                            <span className="block text-white/30">
                                Usually needed when switching to an older version. Deletes what the failed
                                attempt left behind — not your downloaded installer.
                            </span>
                        </span>
                    </label>
                </>
            ) : (
                <p className="mt-5 text-xs leading-relaxed text-white/45">
                    There are no other Proton versions installed to try. Installing Proton GE through
                    ProtonUp-Qt gives Gateway something to fall back on.
                </p>
            )}

            <button
                type="button"
                onClick={onPickManually}
                className="mt-5 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/40 hover:text-white border-b border-transparent hover:border-crimson-500 transition-[color,border-color] duration-100 ease-out-expo"
            >
                Back to the start
            </button>
        </div>
    )
}
