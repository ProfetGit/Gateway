import React from 'react'

export type FallbackImageProps = Omit<React.ImgHTMLAttributes<HTMLImageElement>, 'src'> & {
    /** Ordered candidates, best first. */
    sources: string[]
    /** Rendered when every candidate fails, instead of a broken-image icon. */
    fallback?: React.ReactNode
}

/**
 * An <img> that walks a list of candidate URLs on error.
 *
 * Steam's CDN has no single URL that works for every app — library art is
 * simply absent for some (multiplayer components, newer hashed-asset titles) —
 * so any single-src <img> pointed at a guessed path will sometimes 404. Without
 * a fallback the browser paints its broken-image icon, which is what made two
 * games look blank in the hero banner.
 */
export function FallbackImage({ sources, fallback = null, ...props }: FallbackImageProps) {
    const [index, setIndex] = React.useState(0)

    // Reset when the candidate list changes (e.g. the hero cycles to a new game).
    const key = sources.join('|')
    React.useEffect(() => setIndex(0), [key])

    const src = sources[index]
    if (!src) return <>{fallback}</>

    return (
        <img
            {...props}
            src={src}
            onError={() => setIndex((current) => current + 1)}
        />
    )
}
