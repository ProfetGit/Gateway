export type GameCardCoverArtProps = {
    title: string
    isInstalled: boolean
    imgSrc: string | undefined
    imgLoaded: boolean
    hasCover: boolean
    onLoad: () => void
    onError: () => void
}

export function GameCardCoverArt({ title, isInstalled, imgSrc, imgLoaded, hasCover, onLoad, onError }: GameCardCoverArtProps) {
    return (
        <>
            {/* Corner bracket accents on hover — GPU-only (opacity+scale, no layout animation) */}
            <div className="absolute top-0 left-0 w-6 h-6 border-t-[3px] border-l-[3px] border-crimson-500 origin-top-left opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-[opacity,transform] duration-300 ease-out-expo z-40 pointer-events-none" />
            <div className="absolute bottom-0 right-0 w-6 h-6 border-b-[3px] border-r-[3px] border-crimson-500 origin-bottom-right opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100 transition-[opacity,transform] duration-300 ease-out-expo z-40 pointer-events-none" />

            {/* Base layer — cover or fallback */}
            <div className="absolute inset-0 overflow-hidden">
                {hasCover ? (
                    <img
                        src={imgSrc}
                        alt={title}
                        decoding="async"
                        className={`w-full h-full object-cover group-hover:scale-110 ${imgLoaded ? 'opacity-100' : 'opacity-0'}`}
                        style={{
                            filter: isInstalled ? 'none' : 'grayscale(0.6) brightness(0.6)',
                            transition: 'opacity 200ms ease-out, transform 500ms cubic-bezier(0.16, 1, 0.3, 1)',
                        }}
                        onLoad={onLoad}
                        onError={onError}
                    />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-void-surface to-void-deep flex items-center justify-center">
                        <span className="text-5xl font-display font-black text-white/10 select-none">
                            {title.charAt(0).toUpperCase()}
                        </span>
                    </div>
                )}
            </div>

            {/* Gradient overlay */}
            <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-60 group-hover:opacity-80 transition-opacity duration-300 pointer-events-none" />

            {/* Scanline overlay */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0/0.03)_3px)] opacity-0 group-hover:opacity-60 transition-opacity duration-300 pointer-events-none" />

            {/* Hover glow effect from bottom */}
            <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none bg-gradient-to-t from-crimson-500/15 via-transparent to-transparent" />
        </>
    )
}
