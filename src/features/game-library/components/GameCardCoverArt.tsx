import { cardArtZoom, cardGlowFade, cardOverlayFade, cardTextTint } from '@/components/ui/cards/card-motion'

export type GameCardCoverArtProps = {
    title: string
    isInstalled: boolean
    imgSrc: string | undefined
    imgLoaded: boolean
    hasCover: boolean
    onLoad: (event: React.SyntheticEvent<HTMLImageElement>) => void
    onError: () => void
}

export function GameCardCoverArt({ title, isInstalled, imgSrc, imgLoaded, hasCover, onLoad, onError }: GameCardCoverArtProps) {
    return (
        <>
            {/* Base layer — cover or fallback */}
            <div className="absolute inset-0 overflow-hidden">
                {hasCover ? (
                    <img
                        src={imgSrc}
                        alt={title}
                        decoding="async"
                        className={`w-full h-full object-cover ${cardArtZoom} ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                        style={{ filter: isInstalled ? 'none' : 'grayscale(0.6) brightness(0.6)' }}
                        onLoad={onLoad}
                        onError={onError}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-void-surface to-void-deep flex items-center justify-center">
                        <span className={`text-5xl font-display font-black text-white/10 select-none group-hover:text-white/20 ${cardTextTint}`}>
                            {title.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* Gradient overlay — deepens under the title on hover */}
            <div className={`absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 pointer-events-none ${cardOverlayFade}`} />

            {/* Scanline overlay */}
            <div className={`absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0/0.03)_3px)] opacity-0 group-hover:opacity-60 pointer-events-none ${cardOverlayFade}`} />

            {/* Crimson bloom rising from the bottom edge */}
            <div className={`absolute inset-0 opacity-0 group-hover:opacity-100 pointer-events-none bg-gradient-to-t from-crimson-500/15 via-transparent to-transparent ${cardGlowFade}`} />
        </>
    )
}
