import { useEffect, useState } from 'react'

const STEAM_CDN = 'https://steamcdn-a.akamaihd.net/steam/apps'

export type AddGameCoverPreviewProps = {
    title: string
    /** Chosen by the user; wins over anything Steam offers. */
    coverUrl: string
    linkedAppId?: string
    capsuleUrl?: string
}

/**
 * The card as it will look in the library. Showing the outcome is what replaces
 * the old Cover Image field for the common case — the user checks a picture
 * instead of filling in a URL.
 *
 * Portrait art is tried first and the landscape capsule is the fallback, since
 * newer apps keep every asset behind a content-hashed path and 404 on the
 * guessable one. The real art is mirrored by fetch_game_art after the add.
 */
export function AddGameCoverPreview({ title, coverUrl, linkedAppId, capsuleUrl }: AddGameCoverPreviewProps) {
    const chain = [coverUrl, linkedAppId && `${STEAM_CDN}/${linkedAppId}/library_600x900_2x.jpg`, capsuleUrl]
        .filter((src): src is string => !!src)

    const [index, setIndex] = useState(0)
    useEffect(() => { setIndex(0) }, [coverUrl, linkedAppId, capsuleUrl])

    const src = chain[index]

    return (
        <div className="relative w-full aspect-[3/4] overflow-hidden border border-void-border bg-gradient-to-br from-crimson-950 via-void-surface to-void-pure">
            {src ? (
                <img
                    key={src}
                    src={src}
                    alt=""
                    onError={() => setIndex((i) => i + 1)}
                    className="w-full h-full object-cover"
                />
            ) : (
                <div className="w-full h-full flex items-center justify-center">
                    <span className="font-display font-black italic text-5xl text-white/10 select-none">
                        {title.trim().charAt(0).toUpperCase() || '?'}
                    </span>
                </div>
            )}
            <div className="absolute inset-0 bg-scanlines opacity-15 pointer-events-none" />
        </div>
    )
}
