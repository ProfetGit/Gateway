import { useCallback, useEffect, useState } from 'react'
import { getLaunchSettings } from '@/lib/api/launch-settings'
import { addGame as apiAddGame } from '../../api/add-game'
import { inspectPrefix } from '../../api/inspect-prefix'
import { listProtonBuilds } from '../../api/list-proton-builds'
import { onInstallerProgress } from '../../api/on-installer-progress'
import { runWindowsInstaller } from '../../api/run-windows-installer'
import { cancelWindowsInstaller } from '../../api/cancel-windows-installer'
import { suggestPrefixPath } from '../../api/suggest-prefix-path'
import { useGameStore } from '../../game-store'
import { useSteamMatchStore } from '../../steam-match-store'
import { fetchGameArt } from '../../api/fetch-game-art'
import { deriveTitleFromFilename } from './derive-title-from-filename'
import type { InstallerProgress, ProtonBuild, RankedExecutable } from '../../api/launch-schema'

export type WizardStep = 'setup' | 'running' | 'pick'

export function useInstallWizard(isOpen: boolean, onClose: () => void) {
    const addGameToStore = useGameStore((s) => s.addGame)
    const openSteamMatch = useSteamMatchStore((s) => s.open)

    const [step, setStep] = useState<WizardStep>('setup')
    const [installerPath, setInstallerPath] = useState('')
    const [title, setTitle] = useState('')
    const [linkedAppId, setLinkedAppId] = useState<string | undefined>(undefined)
    const [prefixPath, setPrefixPath] = useState('')
    const [prefixEdited, setPrefixEdited] = useState(false)
    const [prefixHasFiles, setPrefixHasFiles] = useState(false)
    const [protonPath, setProtonPath] = useState('')
    const [protonBuilds, setProtonBuilds] = useState<ProtonBuild[]>([])
    const [progress, setProgress] = useState<InstallerProgress | null>(null)
    const [candidates, setCandidates] = useState<RankedExecutable[]>([])
    const [chosen, setChosen] = useState('')
    const [error, setError] = useState<string | null>(null)

    const reset = useCallback(() => {
        setStep('setup')
        setInstallerPath(''); setTitle(''); setLinkedAppId(undefined)
        setPrefixPath(''); setPrefixEdited(false)
        setPrefixHasFiles(false); setProgress(null); setCandidates([]); setChosen(''); setError(null)
    }, [])

    useEffect(() => {
        if (!isOpen) return
        reset()
        void listProtonBuilds().then(setProtonBuilds).catch(() => {})
        void getLaunchSettings().then((s) => setProtonPath(s.defaultProtonPath ?? '')).catch(() => {})
    }, [isOpen, reset])

    useEffect(() => {
        let unlisten: (() => void) | undefined
        onInstallerProgress(setProgress).then((fn) => { unlisten = fn })
        return () => { unlisten?.() }
    }, [])

    // The prefix follows the title until the user takes it over.
    useEffect(() => {
        if (prefixEdited || !title.trim()) return
        let cancelled = false
        void suggestPrefixPath(title.trim())
            .then((path) => { if (!cancelled) setPrefixPath(path) })
            .catch(() => {})
        return () => { cancelled = true }
    }, [title, prefixEdited])

    // Reusing a prefix that already holds files is legitimate (installing an
    // expansion, retrying) but it breaks the before/after diff, so warn.
    useEffect(() => {
        if (!prefixPath) return setPrefixHasFiles(false)
        let cancelled = false
        void inspectPrefix(prefixPath)
            .then((r) => { if (!cancelled) setPrefixHasFiles(r.exists && r.hasFiles) })
            .catch(() => {})
        return () => { cancelled = true }
    }, [prefixPath])

    const chooseInstaller = useCallback((path: string) => {
        setInstallerPath(path)
        if (!title.trim()) setTitle(deriveTitleFromFilename(path))
    }, [title])

    const editPrefix = useCallback((path: string) => {
        setPrefixEdited(true)
        setPrefixPath(path)
    }, [])

    const run = useCallback(async () => {
        setStep('running')
        setError(null)
        setProgress({ state: 'preparing' })

        const result = await runWindowsInstaller({
            installerPath,
            title: title.trim(),
            prefixPath,
            protonPath: protonPath || undefined,
        }).catch((e: unknown) => {
            console.error('Installer failed:', e)
            return null
        })

        if (!result?.success) {
            setError(result?.error ?? "The installer couldn't be started.")
            setStep('setup')
            return
        }

        setCandidates(result.candidates)
        setChosen(result.candidates[0]?.path ?? '')
        setStep('pick')
    }, [installerPath, title, prefixPath, protonPath])

    const cancel = useCallback(() => {
        void cancelWindowsInstaller()
    }, [])

    const finish = useCallback(async () => {
        if (!chosen) return
        const defaults = await getLaunchSettings().catch(() => null)

        try {
            const game = await apiAddGame({
                title: title.trim(),
                executablePath: chosen,
                winePrefix: prefixPath,
                // Linking here does double duty: art and achievements, and the
                // appid umu hands protonfixes as GAMEID.
                metadataAppId: linkedAppId,
                runner: 'umu',
                protonPath: protonPath || undefined,
                useMangoHud: defaults?.defaultUseMangoHud,
                useGameMode: defaults?.defaultUseGameMode,
                isInstalled: true,
                isFavorite: false,
                source: 'manual',
            })
            addGameToStore(game)
            onClose()
            if (linkedAppId) {
                void fetchGameArt(game.id).catch((err) => {
                    console.error('Failed to fetch art for the installed game:', err)
                })
            } else {
                // Nothing was linked while typing the name — offer the match
                // now, since that is what art and achievements hang off.
                openSteamMatch(game)
            }
        } catch (e) {
            console.error('Failed to add the installed game:', e)
            setError("Couldn't add the game to your library.")
        }
    }, [chosen, title, prefixPath, protonPath, linkedAppId, addGameToStore, onClose, openSteamMatch])

    return {
        step, installerPath, title, setTitle, linkedAppId, setLinkedAppId, prefixPath, prefixHasFiles,
        protonPath, setProtonPath, protonBuilds, progress, candidates, chosen, setChosen,
        error, chooseInstaller, editPrefix, run, cancel, finish,
        canRun: Boolean(installerPath && title.trim() && prefixPath),
    }
}
