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
                className="absolute top-2.5 right-2.5 z-30 p-1.5 rounded-sm bg-black/40 backdrop-blur-sm opacity-0 group-hover:opacity-100 hover:bg-black/60 transition-all duration-200"
            >
                <Star
                    className={`w-3.5 h-3.5 transition-colors ${isFavorite
                        ? 'text-crimson-500 fill-crimson-500'
                        : 'text-white/60 hover:text-white'
                        }`}
                />
            </button>

            {/* Installed indicator */}
            {isInstalled && (
                <div className="absolute top-2.5 left-2.5 z-30 flex items-center gap-1.5">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full shadow-emerald-glow" />
                </div>
            )}
        </>
    )
}
