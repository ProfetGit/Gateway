import { ExternalLink, Star, Trash2 } from 'lucide-react'
import { openSteamStore } from '../../../lib/api'
import { Game } from '../../../types/game'
import { FetchGameDetailsResult } from '../../../types/game'

interface GameDetailMetaStripProps {
    selectedGame: Game
    gameDetails: FetchGameDetailsResult | null
    formattedPlaytime: string
    formattedLastPlayed: string
    formattedSize: string | undefined
    isDeleting: boolean
    toggleFavorite: (id: string) => void
    handleDelete: () => void
}

function MetaStat({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex flex-col gap-0.5">
            <span className="text-[9px] font-mono uppercase tracking-widest text-white/25">{label}</span>
            <span className="text-sm font-mono text-white/65">{value}</span>
        </div>
    )
}

/* h-28 = 112px — must exceed half of cover card height (96px) to fully contain the breach */
export function GameDetailMetaStrip({
    selectedGame,
    gameDetails,
    formattedPlaytime,
    formattedLastPlayed,
    formattedSize,
    isDeleting,
    toggleFavorite,
    handleDelete
}: GameDetailMetaStripProps) {
    const source = selectedGame.source
        ? selectedGame.source.charAt(0).toUpperCase() + selectedGame.source.slice(1)
        : 'Local'

    return (
        <div className="relative z-10 flex items-center h-28 border-b border-void-border/30 bg-void-pure shrink-0 pr-8">
            {/* Stats — pl-48 clears the cover card (left-8=32px + w-36=144px + 16px gap = 192px = pl-48) */}
            <div className="flex-1 flex items-center gap-6 pl-48">
                <MetaStat label="Source" value={source} />
                <div className="w-px h-8 bg-void-border/20 shrink-0" />
                <MetaStat label="Status" value={selectedGame.isInstalled ? 'Ready to play' : 'Not installed'} />
                {formattedSize && (
                    <>
                        <div className="w-px h-8 bg-void-border/20 shrink-0" />
                        <MetaStat label="Size" value={formattedSize} />
                    </>
                )}
                {gameDetails?.details?.releaseDate && (
                    <>
                        <div className="w-px h-8 bg-void-border/20 shrink-0" />
                        <MetaStat label="Released" value={gameDetails.details.releaseDate} />
                    </>
                )}
                <div className="w-px h-8 bg-void-border/20 shrink-0" />
                <MetaStat label="Playtime" value={formattedPlaytime} />
                <div className="w-px h-8 bg-void-border/20 shrink-0" />
                <MetaStat label="Last played" value={formattedLastPlayed} />
            </div>

            {/* Secondary actions */}
            <div className="flex items-center gap-1.5 ml-6">
                <button
                    onClick={() => toggleFavorite(selectedGame.id)}
                    title={selectedGame.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
                    className={`p-2 transition-all duration-100 border ${
                        selectedGame.isFavorite
                            ? 'border-crimson-500/40 bg-crimson-500/10 text-crimson-400'
                            : 'border-void-border/30 bg-transparent text-white/30 hover:text-white/60 hover:border-void-border/60'
                    }`}
                >
                    <Star size={15} className={selectedGame.isFavorite ? 'fill-crimson-400' : ''} />
                </button>

                {selectedGame.steamAppId && (
                    <button
                        onClick={() => openSteamStore(selectedGame.steamAppId!)}
                        title="Open in Steam"
                        className="p-2 border border-void-border/30 bg-transparent text-white/30 hover:text-white/60 hover:border-void-border/60 transition-all duration-100"
                    >
                        <ExternalLink size={15} />
                    </button>
                )}

                {selectedGame.isInstalled && (
                    <button
                        onClick={handleDelete}
                        title={isDeleting ? 'Click again to confirm' : 'Uninstall'}
                        className={`p-2 transition-all duration-100 border ${
                            isDeleting
                                ? 'border-red-500/40 bg-red-500/10 text-red-400'
                                : 'border-void-border/30 bg-transparent text-white/30 hover:text-red-400 hover:border-red-500/30'
                        }`}
                    >
                        <Trash2 size={15} />
                    </button>
                )}
            </div>
        </div>
    )
}
