import { Check, FileDown, Loader2, Search } from 'lucide-react'
import { CornerBrackets } from '@/components/ui/CornerBrackets'
import { selectExecutable } from '@/lib/api/file-dialogs'
import { AddGameCoverPreview } from '../AddGameCoverPreview'
import type { SteamMatchHit } from '../SteamMatchResults'
import type { ProtonBuild } from '../../api/launch-schema'
import { InstallAdvanced } from './InstallAdvanced'

interface InstallSetupStepProps {
    installerPath: string
    title: string
    setTitle: (v: string) => void
    prefixPath: string
    prefixHasFiles: boolean
    protonPath: string
    setProtonPath: (v: string) => void
    protonBuilds: ProtonBuild[]
    onChooseInstaller: (path: string) => void
    onEditPrefix: (path: string) => void
    linked: SteamMatchHit | null
    suggestions: SteamMatchHit[]
    isSearching: boolean
    onLink: (hit: SteamMatchHit | null) => void
}

const SUBTLE_LINK =
    'text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/40 hover:text-white border-b border-transparent hover:border-crimson-500 transition-[color,border-color] duration-100 ease-out-expo'

/**
 * One required act — pick the installer — and everything else follows from it:
 * the name comes off the filename, the folder is suggested from the name, and
 * Proton defaults to latest. Until an installer is chosen there is nothing to
 * fill in, so nothing is shown.
 */
export function InstallSetupStep({
    installerPath, title, setTitle, prefixPath, prefixHasFiles, protonPath, setProtonPath,
    protonBuilds, onChooseInstaller, onEditPrefix, linked, suggestions, isSearching, onLink,
}: InstallSetupStepProps) {
    const browseInstaller = async () => {
        const path = await selectExecutable()
        if (path) onChooseInstaller(path)
    }

    if (!installerPath) {
        return (
            <button
                type="button"
                onClick={() => void browseInstaller()}
                className="group relative w-full overflow-hidden p-6 text-left bg-void-deep border border-void-border hover:border-crimson-500 hover:-translate-y-[3px] transition-[border-color,transform] duration-100 ease-out-expo focus:outline-none focus-visible:border-crimson-500"
            >
                <CornerBrackets colorClass="border-crimson-500" size={22} thickness={2} />
                <FileDown className="w-7 h-7 text-crimson-400" />
                <span className="block mt-4 text-base font-bold text-white">Choose the installer</span>
                <span className="block mt-1.5 text-xs leading-relaxed text-white/45">
                    The setup file you downloaded. Gateway runs it for you and finds the game afterwards.
                </span>
            </button>
        )
    }

    return (
        <>
            <div className="grid grid-cols-[132px_1fr] gap-5">
                <AddGameCoverPreview
                    title={title}
                    coverUrl=""
                    linkedAppId={linked?.appId}
                    capsuleUrl={linked?.capsuleUrl}
                />

                <div className="min-w-0">
                    <label className="block text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32">
                        Name
                    </label>
                    <input
                        value={title}
                        onChange={(e) => setTitle(e.target.value)}
                        placeholder="What to call it in your library"
                        className="mt-1.5 w-full bg-transparent border-0 border-b border-void-border/80 pb-1.5 font-display font-black italic text-[20px] tracking-[-0.02em] text-white placeholder:text-white/20 focus:outline-none focus:border-crimson-500 transition-colors duration-100 ease-out-expo"
                    />

                    <div className="mt-3 min-h-[18px]">
                        {isSearching ? (
                            <p className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/35">
                                <Loader2 className="w-3 h-3 animate-spin" />Looking it up on Steam
                            </p>
                        ) : linked ? (
                            <p className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-emerald-400">
                                <Check className="w-3 h-3" />Found on Steam · cover and achievements included
                            </p>
                        ) : (
                            <p className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/35">
                                <Search className="w-3 h-3" />
                                {suggestions.length > 0 ? 'Not sure which one — pick it, or keep the name' : 'Not found on Steam'}
                            </p>
                        )}
                    </div>

                    {linked ? (
                        <button type="button" onClick={() => onLink(null)} className={`${SUBTLE_LINK} mt-2.5`}>
                            Not this game?
                        </button>
                    ) : suggestions.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-2.5">
                            {suggestions.map((hit) => (
                                <button
                                    key={hit.appId}
                                    type="button"
                                    onClick={() => onLink(hit)}
                                    className="px-2.5 py-1.5 border border-void-border text-[10px] font-mono font-bold tracking-[0.1em] text-white/60 hover:text-white hover:border-crimson-500 transition-[color,border-color] duration-100 ease-out-expo"
                                >
                                    {hit.name}
                                </button>
                            ))}
                        </div>
                    )}

                    <div className="flex items-center gap-3 mt-4 pt-3.5 border-t border-void-border/60">
                        <div className="min-w-0 flex-1">
                            <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32">Installer</p>
                            <p dir="rtl" className="mt-1 text-left text-[11px] font-mono text-white/50 truncate" title={installerPath}>
                                <bdi>{installerPath}</bdi>
                            </p>
                        </div>
                        <button type="button" onClick={() => void browseInstaller()} className={SUBTLE_LINK}>
                            Change
                        </button>
                    </div>
                </div>
            </div>

            <InstallAdvanced
                prefixPath={prefixPath}
                prefixHasFiles={prefixHasFiles}
                onEditPrefix={onEditPrefix}
                protonPath={protonPath}
                setProtonPath={setProtonPath}
                protonBuilds={protonBuilds}
            />
        </>
    )
}
