import { useState } from 'react'
import { Image, RefreshCw } from 'lucide-react'
import { PathField } from '@/components/ui/form/PathField'
import { TextField } from '@/components/ui/form/TextField'
import { selectExecutable, selectImage } from '@/lib/api/file-dialogs'
import { fetchGameArt } from '../../api/fetch-game-art'
import type { GamePropertiesDraft } from './game-properties-form-logic'

interface GamePropertiesGeneralProps {
    draft: GamePropertiesDraft
    setField: <K extends keyof GamePropertiesDraft>(key: K, value: GamePropertiesDraft[K]) => void
    gameId: string
    /** The Steam appid this game is matched to, if any. */
    artAppId: string | undefined
}

export function GamePropertiesGeneral({ draft, setField, gameId, artAppId }: GamePropertiesGeneralProps) {
    const [artState, setArtState] = useState<'idle' | 'working' | 'done' | 'none'>('idle')

    // The match flow does this automatically. This is the retry, for games
    // matched before art fetching existed, or when the download failed.
    const refreshArt = async () => {
        setArtState('working')
        const result = await fetchGameArt(gameId, true).catch(() => null)
        setArtState(result?.success ? 'done' : 'none')
    }

    const browseExecutable = async () => {
        const path = await selectExecutable()
        if (path) setField('executablePath', path)
    }

    const browseCover = async () => {
        const path = await selectImage()
        if (path) setField('coverUrl', `file://${path}`)
    }

    return (
        <div className="space-y-5">
            <TextField
                label="Title"
                required
                value={draft.title}
                onChange={(v) => setField('title', v)}
                placeholder="Game title"
            />

            <PathField
                label="Game File"
                value={draft.executablePath}
                onChange={(v) => setField('executablePath', v)}
                onBrowse={browseExecutable}
                placeholder="Where the game lives on your computer"
                browseLabel="Choose game file"
            />

            <PathField
                label="Cover Image"
                value={draft.coverUrl}
                onChange={(v) => setField('coverUrl', v)}
                onBrowse={browseCover}
                placeholder="Image link or pick a file"
                icon={<Image className="w-4 h-4" />}
                browseLabel="Choose cover image"
            />

            {artAppId && (
                <div className="flex items-center gap-3">
                    <button
                        type="button"
                        onClick={() => { void refreshArt() }}
                        disabled={artState === 'working'}
                        className="flex items-center gap-2 px-3 py-2 text-xs font-mono uppercase tracking-widest border border-void-border bg-void-surface text-text-muted hover:text-text-primary transition-colors duration-100 disabled:opacity-40"
                    >
                        <RefreshCw className={`w-3.5 h-3.5 ${artState === 'working' ? 'animate-spin' : ''}`} />
                        Get artwork from Steam
                    </button>
                    {artState === 'done' && <span className="text-xs text-emerald-400">Artwork updated</span>}
                    {artState === 'none' && <span className="text-xs text-text-muted">No artwork found</span>}
                </div>
            )}

            <TextField
                label="Notes"
                multiline
                value={draft.notes}
                onChange={(v) => setField('notes', v)}
                placeholder="Anything you want to remember about this game"
            />
        </div>
    )
}
