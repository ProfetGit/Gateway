import { Star } from 'lucide-react'

export type GameCardBadgesProps = {
    isFavorite: boolean
    isInstalled: boolean
    onFavorite: (e: React.MouseEvent) => void
}

export function GameCardBadges({ isFavorite, isInstalled, onFavorite }: GameCardBadgesProps) {
    return (
        <>
            {/* Favorite button */}
            <button
                onClick={onFavorite}
                className="absolute top-2.5 right-2.5 z-30 flex items-center justify-center rounded-sm bg-black/40 backdrop-blur-sm opacity-0 -translate-y-1 group-hover:opacity-100 group-hover:translate-y-0 hover:bg-black/60 hover:scale-110 active:scale-95 transition-[opacity,transform,background-color] duration-100 ease-out-expo group-hover:duration-200 group-hover:delay-[50ms]"
                // Grows with the card, but on a flatter curve than the play
                // button — a favourite toggle shouldn't scale 1:1 with the cover.
                // The 26px floor is the hit target on the smallest grid; the
                // ceiling only engages past ~450px cards.
                style={{ width: 'clamp(26px, calc(9cqw + 6px), 46px)', aspectRatio: '1' }}
            >
                <Star
                    className={`w-[58%] h-[58%] transition-colors duration-100 ease-out-expo ${isFavorite
                        ? 'text-crimson-500 fill-crimson-500'
                        : 'text-white/60 hover:text-white'
                        }`}
                />
            </button>

            {/* Installed indicator */}
            {isInstalled && (
                <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5">
                    <div
                        className="bg-emerald-500 rounded-full shadow-emerald-glow"
                        style={{ width: 'clamp(7px, 4.5cqw, 16px)', aspectRatio: '1' }}
                    />
                </div>
            )}
        </>
    )
}
