import { useCallback, useEffect, useState } from 'react'
import { Check, X } from 'lucide-react'
import { PathField } from '@/components/ui/form/PathField'
import { SelectField } from '@/components/ui/form/SelectField'
import { ToggleField } from '@/components/ui/form/ToggleField'
import { selectDirectory } from '@/lib/api/file-dialogs'
import { getLaunchSettings, setLaunchSettings, type LaunchSettings } from '@/lib/api/launch-settings'
import { detectLaunchTools } from '@/features/game-library/api/detect-launch-tools'
import { listProtonBuilds } from '@/features/game-library/api/list-proton-builds'
import type { LaunchTools, ProtonBuild } from '@/features/game-library/api/launch-schema'

const TOOLS: { key: keyof LaunchTools; name: string; blurb: string; pkg: string }[] = [
    { key: 'umu', name: 'Proton support', blurb: 'Runs Windows games the way Steam does', pkg: 'umu-launcher' },
    { key: 'wine', name: 'Wine', blurb: 'Older fallback for Windows games', pkg: 'wine' },
    { key: 'gamemode', name: 'GameMode', blurb: 'Prioritises a game while it runs', pkg: 'gamemode' },
    { key: 'mangohud', name: 'MangoHud', blurb: 'Performance overlay on top of the game', pkg: 'mangohud' },
]

export function LaunchDefaultsSection() {
    const [settings, setSettings] = useState<LaunchSettings | null>(null)
    const [tools, setTools] = useState<LaunchTools | null>(null)
    const [protonBuilds, setProtonBuilds] = useState<ProtonBuild[]>([])

    useEffect(() => {
        void getLaunchSettings().then(setSettings).catch(() => {})
        void detectLaunchTools().then(setTools).catch(() => {})
        void listProtonBuilds().then(setProtonBuilds).catch(() => {})
    }, [])

    // Optimistic: the panel reflects the change immediately and the write goes
    // out behind it. A failed write is logged, not surfaced — these are
    // preferences, not data, and the next open re-reads the truth.
    const patch = useCallback((updates: Partial<LaunchSettings>) => {
        setSettings((current) => (current ? { ...current, ...updates } : current))
        void setLaunchSettings(updates).catch((e) => console.error('Failed to save launch defaults:', e))
    }, [])

    if (!settings) return null

    const browsePrefixRoot = async () => {
        const path = await selectDirectory()
        if (path) patch({ prefixRoot: path })
    }

    return (
        <div className="space-y-6">
            <p className="font-mono text-[10px] text-white/40 tracking-wider uppercase">
                These apply to games you add from now on. Change an existing game in its own
                Properties.
            </p>

            <PathField
                label="Where to keep Windows game files"
                value={settings.prefixRoot}
                onChange={(v) => patch({ prefixRoot: v })}
                onBrowse={browsePrefixRoot}
                hint="Each Windows game gets its own folder here for saves, settings and installed components."
                browseLabel="Choose folder"
            />

            <SelectField
                label="Proton version"
                value={settings.defaultProtonPath ?? ''}
                options={[
                    { value: '', label: 'Latest, downloaded automatically' },
                    ...protonBuilds.map((build) => ({ value: build.path, label: build.name })),
                ]}
                onChange={(v) => patch({ defaultProtonPath: v || undefined })}
                hint={protonBuilds.length === 0 ? 'No installed versions found — Gateway will fetch one when you first need it.' : undefined}
            />

            <div className="space-y-4">
                <ToggleField
                    label="Show performance overlay (MangoHud)"
                    checked={settings.defaultUseMangoHud}
                    onChange={(v) => patch({ defaultUseMangoHud: v })}
                    disabledReason={tools && !tools.mangohud ? "MangoHud isn't installed. Install the mangohud package to use it." : undefined}
                />
                <ToggleField
                    label="Prioritise games while they run (GameMode)"
                    checked={settings.defaultUseGameMode}
                    onChange={(v) => patch({ defaultUseGameMode: v })}
                    disabledReason={tools && !tools.gamemode ? "GameMode isn't installed. Install the gamemode package to use it." : undefined}
                />
            </div>

            <div className="space-y-2 pt-2 border-t border-white/10">
                <p className="font-mono text-[10px] text-white/40 tracking-wider uppercase pt-4">
                    Installed on this computer
                </p>
                {TOOLS.map(({ key, name, blurb, pkg }) => (
                    <ToolRow key={key} name={name} blurb={blurb} pkg={pkg} present={tools?.[key]} />
                ))}
            </div>
        </div>
    )
}

function ToolRow({ name, blurb, pkg, present }: { name: string; blurb: string; pkg: string; present?: boolean }) {
    return (
        <div className="flex items-center gap-3 py-2">
            <span
                className={`w-6 h-6 flex items-center justify-center border shrink-0 ${
                    present
                        ? 'border-emerald-500/40 bg-emerald-500/10 text-emerald-400'
                        : 'border-void-border bg-void-surface text-white/25'
                }`}
            >
                {present ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
            </span>
            <div className="min-w-0">
                <p className="text-sm text-white/80">{name}</p>
                <p className="text-xs text-white/35 truncate">
                    {present ? blurb : `Not installed — package "${pkg}"`}
                </p>
            </div>
        </div>
    )
}
