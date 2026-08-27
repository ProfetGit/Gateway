import { motion } from 'framer-motion'
import { ExternalLink, Gamepad2, Link2, SlidersHorizontal, Star, Trash2 } from 'lucide-react'
import { openSteamStore } from '@/lib/api/navigation'
import { useGameStore } from '../../game-store'
import { useSteamMatchStore } from '../../steam-match-store'
import type { Game } from '../../game-library-types'
import { coverVariants, launchVariants, railItem } from './game-detail-animations'
import { GameDetailLaunch } from './GameDetailLaunch'
import { GameDetailRailStats } from './GameDetailRailStats'

const ICON_BUTTON =
    'w-8 h-8 flex items-center justify-center border border-void-border/70 text-white/35 hover:text-white hover:border-crimson-500 hover:-translate-y-0.5 transition-[color,border-color,transform] duration-100 ease-out-expo'

export type GameDetailRailProps = {
    game: Game
    coverSrc: string | undefined
    onCoverError: () => void
    playtimeHours: number
    completion: number
    hasAchievements: boolean
    lastPlayed: string
    size: string | undefined
    released: string | undefined
    isInstalling: boolean
    isDeleting: boolean
    onPrimary: () => void
    onDelete: () => void
}

export function GameDetailRail({
    game, coverSrc, onCoverError, playtimeHours, completion, hasAchievements,
    lastPlayed, size, released, isInstalling, isDeleting, onPrimary, onDelete,
}: GameDetailRailProps) {
    const toggleFavorite = useGameStore((s) => s.toggleFavorite)
    const openProperties = useGameStore((s) => s.openProperties)
    const openSteamMatch = useSteamMatchStore((s) => s.open)
    const source = game.source ? game.source[0]!.toUpperCase() + game.source.slice(1) : 'Local'

    return (
        <aside className="relative flex flex-col bg-void-deep border-r border-void-border shrink-0 w-[300px]">
            {/* Cover bleeds to the rail's edges; the title sits in its own fade,
                so there is no floating cover card for anything to dodge. */}
            {/* 3:4 until the window is short, then capped — object-cover crops
                rather than letting the cover push the vitals into the footer. */}
            <motion.div
                variants={coverVariants}
                className="relative w-full aspect-[3/4] max-h-[40vh] shrink-0 overflow-hidden skeleton-block"
            >
                {coverSrc ? (
                    <img src={coverSrc} alt="" onError={onCoverError} className="w-full h-full object-cover" />
                ) : (
                    <div className="w-full h-full bg-gradient-to-br from-crimson-950 via-void-surface to-void-pure flex items-center justify-center">
                        <Gamepad2 className="w-10 h-10 text-white/10" />
                    </div>
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-void-deep via-void-deep/15 to-transparent" />
                <div className="absolute inset-0 bg-scanlines opacity-15 pointer-events-none" />

                <div className="absolute inset-x-5 bottom-3.5">
                    {game.isInstalled && (
                        <span className="inline-flex items-center gap-1.5 px-2 py-1 border border-emerald-500/40 text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-emerald-400">
                            <i className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                            Installed
                        </span>
                    )}
                    <h2 className="mt-2 font-display font-black italic text-2xl leading-[0.95] tracking-[-0.025em] text-white text-balance">
                        {game.title}
                    </h2>
                </div>
            </motion.div>

            <div className="flex-1 min-h-0 flex flex-col gap-4 px-5 pt-4">
                <motion.div variants={launchVariants}>
                    <GameDetailLaunch isInstalled={game.isInstalled} isInstalling={isInstalling} onClick={onPrimary} />
                </motion.div>

                <motion.div variants={railItem(1)}>
                    <GameDetailRailStats
                        playtimeHours={playtimeHours}
                        completion={completion}
                        hasAchievements={hasAchievements}
                    />
                </motion.div>

                <motion.dl
                    variants={railItem(2)}
                    className="mt-auto mb-4 grid grid-cols-2 gap-x-3.5 gap-y-2.5 pt-3.5 border-t border-void-border/55"
                >
                    <Meta label="Last played" value={lastPlayed} />
                    {size && <Meta label="Size" value={size} />}
                    <Meta label="Source" value={source} />
                    {released && <Meta label="Released" value={released} />}
                </motion.dl>
            </div>

            <motion.div
                variants={railItem(3)}
                className="flex items-center justify-between px-5 py-3.5 border-t border-void-border/55"
            >
                <div className="flex gap-1.5">
                    <button
                        onClick={() => toggleFavorite(game.id)}
                        title={game.isFavorite ? 'Remove from favourites' : 'Add to favourites'}
                        className={game.isFavorite
                            ? 'w-8 h-8 flex items-center justify-center border border-crimson-500/40 bg-crimson-500/10 text-crimson-400 transition-colors duration-100 ease-out-expo'
                            : ICON_BUTTON}
                    >
                        <Star className={`w-3.5 h-3.5 ${game.isFavorite ? 'fill-crimson-400' : ''}`} />
                    </button>

                    {game.steamAppId ? (
                        <button onClick={() => openSteamStore(game.steamAppId!)} title="Open in Steam" className={ICON_BUTTON}>
                            <ExternalLink className="w-3.5 h-3.5" />
                        </button>
                    ) : (
                        <button onClick={() => openSteamMatch(game)} title="Match to a Steam game" className={ICON_BUTTON}>
                            <Link2 className="w-3.5 h-3.5" />
                        </button>
                    )}

                    <button onClick={() => openProperties(game)} title="Properties" className={ICON_BUTTON}>
                        <SlidersHorizontal className="w-3.5 h-3.5" />
                    </button>
                </div>

                {game.isInstalled && (
                    <button
                        onClick={onDelete}
                        title={isDeleting ? 'Click again to confirm' : 'Uninstall'}
                        className={isDeleting
                            ? 'w-8 h-8 flex items-center justify-center border border-crimson-500/50 bg-crimson-500/15 text-crimson-300 transition-colors duration-100 ease-out-expo'
                            : ICON_BUTTON}
                    >
                        <Trash2 className="w-3.5 h-3.5" />
                    </button>
                )}
            </motion.div>
        </aside>
    )
}

function Meta({ label, value }: { label: string; value: string }) {
    return (
        <div>
            <dt className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32">{label}</dt>
            <dd className="mt-0.5 text-[12.5px] text-white/62">{value}</dd>
        </div>
    )
}
