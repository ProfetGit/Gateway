import { TextField } from '@/components/ui/form/TextField'
import { ToggleField } from '@/components/ui/form/ToggleField'
import type { LaunchTools } from '../../api/launch-schema'
import type { GamePropertiesDraft } from './game-properties-form-logic'

interface GamePropertiesTweaksProps {
    draft: GamePropertiesDraft
    setField: <K extends keyof GamePropertiesDraft>(key: K, value: GamePropertiesDraft[K]) => void
    tools: LaunchTools | null
}

export function GamePropertiesTweaks({ draft, setField, tools }: GamePropertiesTweaksProps) {
    // Until detection has answered, leave the toggles alone rather than
    // flashing them disabled and then enabling them a moment later.
    const missing = (available: boolean | undefined, name: string, pkg: string) =>
        tools && !available ? `${name} isn't installed. Install the ${pkg} package to use it.` : undefined

    return (
        <div className="space-y-5">
            <TextField
                label="Launch Arguments"
                mono
                value={draft.launchArgs}
                onChange={(v) => setField('launchArgs', v)}
                placeholder="-windowed -skipintro"
                hint="Passed to the game. Put quotes around anything containing spaces."
            />

            <TextField
                label="Environment Variables"
                mono
                multiline
                rows={2}
                value={draft.customEnvVars}
                onChange={(v) => setField('customEnvVars', v)}
                placeholder="DXVK_HUD=fps WINEDLLOVERRIDES=&quot;d3d11=n,b&quot;"
                hint="One per space, as NAME=value. These override everything Gateway sets."
            />

            <div className="space-y-4 pt-1">
                <ToggleField
                    label="Show performance overlay (MangoHud)"
                    checked={draft.useMangoHud}
                    onChange={(v) => setField('useMangoHud', v)}
                    hint="Frame rate, temperatures and frame times on top of the game."
                    disabledReason={missing(tools?.mangohud, 'MangoHud', 'mangohud')}
                />

                <ToggleField
                    label="Prioritise this game (GameMode)"
                    checked={draft.useGameMode}
                    onChange={(v) => setField('useGameMode', v)}
                    hint="Asks the system to favour the game while it runs."
                    disabledReason={missing(tools?.gamemode, 'GameMode', 'gamemode')}
                />
            </div>
        </div>
    )
}
