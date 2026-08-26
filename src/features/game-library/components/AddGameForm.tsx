import { Image } from 'lucide-react'
import { PathField } from '@/components/ui/form/PathField'
import { SteamTitleField } from './SteamTitleField'
import type { SteamMatchHit } from './SteamMatchResults'

export type AddGameFormProps = {
    title: string
    setTitle: (v: string) => void
    coverUrl: string
    setCoverUrl: (v: string) => void
    executablePath: string
    setExecutablePath: (v: string) => void
    onSelectImage: () => void
    onSelectExecutable: () => void
    linkedAppId?: string
    onLink: (hit: SteamMatchHit | null) => void
}

export function AddGameForm({
    title, setTitle, coverUrl, setCoverUrl, executablePath, setExecutablePath,
    onSelectImage, onSelectExecutable, linkedAppId, onLink,
}: AddGameFormProps) {
    return (
        <>
            <SteamTitleField
                value={title}
                onChange={setTitle}
                linkedAppId={linkedAppId}
                onLink={onLink}
            />

            <PathField
                label="Cover Image"
                value={coverUrl}
                onChange={setCoverUrl}
                onBrowse={onSelectImage}
                placeholder="Image link or pick a file"
                icon={<Image className="w-4 h-4" />}
                browseLabel="Choose cover image"
            />

            <PathField
                label="Game File"
                value={executablePath}
                onChange={setExecutablePath}
                onBrowse={onSelectExecutable}
                placeholder="Where the game lives on your computer"
                browseLabel="Choose game file"
            />
        </>
    )
}
