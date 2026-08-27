import { useState } from 'react'
import { AlertTriangle, ChevronRight } from 'lucide-react'
import { PathField } from '@/components/ui/form/PathField'
import { SelectField } from '@/components/ui/form/SelectField'
import { selectDirectory } from '@/lib/api/file-dialogs'
import type { ProtonBuild } from '../../api/launch-schema'

export type InstallAdvancedProps = {
    prefixPath: string
    prefixHasFiles: boolean
    onEditPrefix: (path: string) => void
    protonPath: string
    setProtonPath: (v: string) => void
    protonBuilds: ProtonBuild[]
}

/**
 * Collapsed by default, and that is the point: Gateway already suggests the
 * folder from the game's name and defaults Proton to "latest, downloaded
 * automatically". Both fields told the user to leave them alone while sitting
 * in the middle of the form at full weight — so they are behind one line now,
 * which opens on its own if the chosen folder needs attention.
 */
export function InstallAdvanced({
    prefixPath, prefixHasFiles, onEditPrefix, protonPath, setProtonPath, protonBuilds,
}: InstallAdvancedProps) {
    const [open, setOpen] = useState(false)
    const expanded = open || prefixHasFiles

    return (
        <div className="mt-5 pt-4 border-t border-void-border/60">
            <button
                type="button"
                onClick={() => setOpen((v) => !v)}
                aria-expanded={expanded}
                className="group flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.16em] text-white/40 hover:text-white transition-colors duration-100 ease-out-expo"
            >
                <ChevronRight
                    className={`w-3 h-3 transition-transform duration-150 ease-out-expo ${expanded ? 'rotate-90' : ''}`}
                />
                Install folder and Proton version
            </button>

            {expanded && (
                <div className="mt-4 space-y-4">
                    <PathField
                        label="Where to install it"
                        value={prefixPath}
                        onChange={onEditPrefix}
                        onBrowse={async () => {
                            const path = await selectDirectory()
                            if (path) onEditPrefix(path)
                        }}
                        hint="This folder holds the game's Windows files, saves and settings."
                        browseLabel="Choose folder"
                    />

                    {prefixHasFiles && (
                        <div className="flex gap-2.5 p-3 border border-amber-500/40 bg-amber-500/5">
                            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                            <p className="text-xs text-white/60 leading-relaxed">
                                That folder already has something in it. The install will still work, but
                                Gateway may need your help picking the right game file afterwards.
                            </p>
                        </div>
                    )}

                    <SelectField
                        label="Proton version"
                        value={protonPath}
                        options={[
                            { value: '', label: 'Latest, downloaded automatically' },
                            ...protonBuilds.map((build) => ({ value: build.path, label: build.name })),
                        ]}
                        onChange={setProtonPath}
                        hint="Leave this alone unless the game needs a specific version."
                    />
                </div>
            )}
        </div>
    )
}
