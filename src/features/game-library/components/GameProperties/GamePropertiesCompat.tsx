import { SelectField } from '@/components/ui/form/SelectField'
import { PathField } from '@/components/ui/form/PathField'
import { selectDirectory } from '@/lib/api/file-dialogs'
import type { ProtonBuild } from '../../api/launch-schema'
import type { GamePropertiesDraft } from './game-properties-form-logic'
import type { LaunchRunner } from '../../game-library-types'

const RUNNER_OPTIONS = [
    { value: 'auto', label: 'Choose for me' },
    { value: 'umu', label: 'Proton (recommended for Windows games)' },
    { value: 'wine', label: 'Wine' },
    { value: 'native', label: 'Run directly (Linux game)' },
]

const RUNNER_HINTS: Record<LaunchRunner, string> = {
    auto: 'Windows files run under Proton, Linux files run directly.',
    umu: 'Runs the game the way Steam does, with the fixes Proton ships for it.',
    wine: 'Older and simpler than Proton. Try this only if Proton will not start the game.',
    native: 'Starts the file as-is, with no Windows compatibility layer.',
}

interface GamePropertiesCompatProps {
    draft: GamePropertiesDraft
    setField: <K extends keyof GamePropertiesDraft>(key: K, value: GamePropertiesDraft[K]) => void
    protonBuilds: ProtonBuild[]
    /** False for Heroic, Lutris and owned Steam games — their launcher owns the runtime. */
    editable: boolean
}

export function GamePropertiesCompat({ draft, setField, protonBuilds, editable }: GamePropertiesCompatProps) {
    if (!editable) {
        return (
            <p className="text-sm text-text-muted leading-relaxed">
                This game starts through Steam, Heroic or Lutris, so those apps decide how it runs.
                Change its Proton version and settings there.
            </p>
        )
    }

    const browsePrefix = async () => {
        const path = await selectDirectory()
        if (path) setField('winePrefix', path)
    }

    // Selecting BROWSE opens the folder picker instead of storing a value, so
    // a build Gateway did not find is still reachable without a second field.
    const BROWSE = '__browse__'

    const protonOptions = [
        { value: '', label: 'Latest, downloaded automatically' },
        ...protonBuilds.map((build) => ({ value: build.path, label: build.name })),
        ...(draft.protonPath && !protonBuilds.some((b) => b.path === draft.protonPath)
            ? [{ value: draft.protonPath, label: `${draft.protonPath.split('/').pop()} (chosen folder)` }]
            : []),
        { value: BROWSE, label: 'Choose a folder…' },
    ]

    const changeProton = async (value: string) => {
        if (value !== BROWSE) {
            setField('protonPath', value)
            return
        }
        const path = await selectDirectory()
        if (path) setField('protonPath', path)
    }

    return (
        <div className="space-y-5">
            <SelectField
                label="How to run this game"
                value={draft.runner}
                options={RUNNER_OPTIONS}
                onChange={(v) => setField('runner', v as LaunchRunner)}
                hint={RUNNER_HINTS[draft.runner]}
            />

            <SelectField
                label="Proton version"
                value={draft.protonPath}
                options={protonOptions}
                onChange={(v) => { void changeProton(v) }}
                hint="Leave this alone unless a game needs a specific version."
            />

            <PathField
                label="Windows files folder (Wine prefix)"
                value={draft.winePrefix}
                onChange={(v) => setField('winePrefix', v)}
                onBrowse={browsePrefix}
                placeholder="Where this game's Windows files live"
                hint="Saves, settings and installed Windows components live here. Each game usually gets its own."
                browseLabel="Choose folder"
            />
        </div>
    )
}
