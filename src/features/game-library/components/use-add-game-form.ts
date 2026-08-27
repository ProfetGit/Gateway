import { useCallback, useState } from 'react'
import { selectExecutable, selectImage } from '@/lib/api/file-dialogs'
import { deriveTitleFromFilename } from './InstallWindowsGame/derive-title-from-filename'
import { useSteamAutoMatch } from '../use-steam-auto-match'
import type { SteamMatchHit } from './SteamMatchResults'

export type AddGameStep = 'choose' | 'review'

/**
 * Form state for adding a game, plus the chain that makes step two a preview
 * rather than a form: file → name → Steam match → art.
 */
export function useAddGameForm() {
    const [step, setStep] = useState<AddGameStep>('choose')
    const [title, setTitle] = useState('')
    const [coverUrl, setCoverUrl] = useState('')
    const [executablePath, setExecutablePath] = useState('')

    const match = useSteamAutoMatch(title, step === 'review')

    const reset = useCallback(() => {
        setStep('choose')
        setTitle('')
        setCoverUrl('')
        setExecutablePath('')
        match.reset()
    }, [match])

    const browseExecutable = useCallback(async () => {
        const path = await selectExecutable()
        if (!path) return false
        setExecutablePath(path)
        setTitle((current) => current || deriveTitleFromFilename(path))
        setStep('review')
        return true
    }, [])

    const browseCover = useCallback(async () => {
        const path = await selectImage()
        if (path) setCoverUrl(`file://${path}`)
    }, [])

    const chooseMatch = useCallback((hit: SteamMatchHit | null) => {
        match.chooseMatch(hit)
        if (hit) setTitle(hit.name)
    }, [match])

    const editTitle = useCallback((next: string) => {
        setTitle(next)
        match.releaseMatch()
    }, [match])

    return {
        step, setStep, title, editTitle, coverUrl, executablePath,
        linked: match.linked, suggestions: match.suggestions, isSearching: match.isSearching,
        reset, browseExecutable, browseCover, chooseMatch,
    }
}
