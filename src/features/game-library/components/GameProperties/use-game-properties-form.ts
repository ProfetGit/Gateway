import { useCallback, useEffect, useState } from 'react'
import { detectLaunchTools } from '../../api/detect-launch-tools'
import { listProtonBuilds } from '../../api/list-proton-builds'
import { updateGame as apiUpdateGame } from '../../api/update-game'
import { useGameStore } from '../../game-store'
import type { LaunchTools, ProtonBuild } from '../../api/launch-schema'
import type { Game } from '../../game-library-types'
import {
    buildUpdates,
    canSave,
    draftFromGame,
    isDirty,
    type GamePropertiesDraft,
} from './game-properties-form-logic'

export function useGamePropertiesForm(game: Game | null, onSaved: () => void) {
    const updateGameInStore = useGameStore((s) => s.updateGame)

    const [draft, setDraft] = useState<GamePropertiesDraft | null>(null)
    const [tools, setTools] = useState<LaunchTools | null>(null)
    const [protonBuilds, setProtonBuilds] = useState<ProtonBuild[]>([])
    const [isSaving, setIsSaving] = useState(false)
    const [error, setError] = useState<string | null>(null)

    // Re-seed whenever a different game is opened, so the panel never shows
    // the previous game's values for a frame.
    useEffect(() => {
        setDraft(game ? draftFromGame(game) : null)
        setError(null)
    }, [game])

    useEffect(() => {
        if (!game) return
        let cancelled = false
        void detectLaunchTools().then((t) => { if (!cancelled) setTools(t) }).catch(() => {})
        void listProtonBuilds().then((b) => { if (!cancelled) setProtonBuilds(b) }).catch(() => {})
        return () => { cancelled = true }
    }, [game])

    const setField = useCallback(<K extends keyof GamePropertiesDraft>(
        key: K,
        value: GamePropertiesDraft[K]
    ) => {
        setDraft((current) => (current ? { ...current, [key]: value } : current))
    }, [])

    const save = useCallback(async () => {
        if (!game || !draft || !canSave(draft)) return
        const updates = buildUpdates(game, draft)
        if (Object.keys(updates).length === 0) {
            onSaved()
            return
        }

        setIsSaving(true)
        setError(null)
        try {
            await apiUpdateGame(game.id, updates)
            updateGameInStore(game.id, updates)
            onSaved()
        } catch (e) {
            console.error('Failed to save game properties:', e)
            setError("Couldn't save those changes.")
        } finally {
            setIsSaving(false)
        }
    }, [game, draft, onSaved, updateGameInStore])

    return {
        draft,
        setField,
        tools,
        protonBuilds,
        isSaving,
        error,
        save,
        dirty: Boolean(game && draft && isDirty(game, draft)),
        canSave: Boolean(draft && canSave(draft)),
    }
}
