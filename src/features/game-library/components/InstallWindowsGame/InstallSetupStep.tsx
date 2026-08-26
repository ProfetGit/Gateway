import { AlertTriangle } from 'lucide-react'
import { PathField } from '@/components/ui/form/PathField'
import { SelectField } from '@/components/ui/form/SelectField'
import { selectDirectory, selectExecutable } from '@/lib/api/file-dialogs'
import { SteamTitleField } from '../SteamTitleField'
import type { SteamMatchHit } from '../SteamMatchResults'
import type { ProtonBuild } from '../../api/launch-schema'

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
    linkedAppId?: string
    onLink: (hit: SteamMatchHit | null) => void
}

export function InstallSetupStep({
    installerPath, title, setTitle, prefixPath, prefixHasFiles,
    protonPath, setProtonPath, protonBuilds, onChooseInstaller, onEditPrefix,
    linkedAppId, onLink,
}: InstallSetupStepProps) {
    const browseInstaller = async () => {
        const path = await selectExecutable()
        if (path) onChooseInstaller(path)
    }

    const browsePrefix = async () => {
        const path = await selectDirectory()
        if (path) onEditPrefix(path)
    }

    return (
        <div className="space-y-5">
            <PathField
                label="Installer"
                value={installerPath}
                onChange={onChooseInstaller}
                onBrowse={browseInstaller}
                placeholder="The setup file you downloaded"
                browseLabel="Choose installer"
            />

            <SteamTitleField
                label="Game name"
                value={title}
                onChange={setTitle}
                linkedAppId={linkedAppId}
                onLink={onLink}
                placeholder="What to call it in your library"
            />

            <PathField
                label="Where to install it"
                value={prefixPath}
                onChange={onEditPrefix}
                onBrowse={browsePrefix}
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
    )
}
