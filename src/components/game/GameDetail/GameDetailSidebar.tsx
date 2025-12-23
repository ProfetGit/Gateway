import { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Game } from '../../../types/game'
import { FetchGameDetailsResult } from '../../../types/game'
import {
    Activity,
    ChevronDown,
    ExternalLink,
    Maximize2,
    Monitor,
    Settings,
    Star,
    Trash2,
    Zap
} from 'lucide-react'
import { InfoRow } from './StatCards'
import { LaunchToggle, GamescopeInput, GamescopeMiniToggle } from './LaunchOptions'

interface GameDetailSidebarProps {
    selectedGame: Game
    imgSrc: string | undefined
    gameDetails: FetchGameDetailsResult | null
    isDeleting: boolean
    toggleFavorite: (id: string) => void
    updateGame: (id: string, updates: Partial<Game>) => void
    handleDelete: () => void
    handleImageError: () => void
}

export function GameDetailSidebar({
    selectedGame,
    imgSrc,
    gameDetails,
    isDeleting,
    toggleFavorite,
    updateGame,
    handleDelete,
    handleImageError
}: GameDetailSidebarProps) {
    const [gamescopeExpanded, setGamescopeExpanded] = useState(false)

    // Steam games don't support launch options from Gateway
    const isSteamGame = selectedGame.source === 'steam'

    return (
        <div className="relative w-[280px] shrink-0 bg-void-deep border-r border-void-border/30 flex flex-col">
            {/* Ambient bleed background */}
            <div className="absolute inset-0 overflow-hidden">
                {imgSrc && (
                    <img
                        src={imgSrc}
                        className="ambient-bleed w-full h-full object-cover"
                        alt=""
                    />
                )}
                <div className="absolute inset-0 bg-void-deep/80" />
            </div>

            {/* Cover Art */}
            <div className="relative p-4 z-10">
                <motion.div
                    className="relative aspect-[3/4] rounded-lg overflow-hidden border border-void-border/50 shadow-void-lift group"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.1 }}
                >
                    {/* Corner accents */}
                    <div className="absolute top-0 left-0 w-4 h-4 border-t-2 border-l-2 border-crimson-500/60 z-20 pointer-events-none" />
                    <div className="absolute bottom-0 right-0 w-4 h-4 border-b-2 border-r-2 border-crimson-500/60 z-20 pointer-events-none" />

                    {imgSrc ? (
                        <img
                            src={imgSrc}
                            className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
                            onError={handleImageError}
                            alt={selectedGame.title}
                        />
                    ) : (
                        <div className="w-full h-full bg-void-surface flex items-center justify-center">
                            <span className="text-6xl font-display font-black text-white/5">
                                {selectedGame.title.charAt(0)}
                            </span>
                        </div>
                    )}

                    {/* Scanline overlay */}
                    <div className="absolute inset-0 bg-scanlines opacity-30 pointer-events-none" />

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-void-pure/60 via-transparent to-transparent pointer-events-none" />

                    {/* Installed indicator */}
                    {selectedGame.isInstalled && (
                        <div className="absolute top-2 left-2 z-30 flex items-center gap-1.5 px-2 py-1 bg-black/60 backdrop-blur-sm rounded">
                            <div className="w-1.5 h-1.5 bg-emerald-500 rounded-full shadow-[0_0_8px_rgba(16,185,129,0.8)]" />
                            <span className="text-[9px] font-mono uppercase tracking-wider text-emerald-400">Installed</span>
                        </div>
                    )}
                </motion.div>
            </div>

            {/* Quick Info */}
            <div className="flex-1 px-4 pb-4 z-10 space-y-3 overflow-y-auto scrollbar-hide">
                <div className="space-y-2">
                    <InfoRow label="Platform" value={selectedGame.source?.toUpperCase() || 'LOCAL'} icon={<Monitor size={12} />} />
                    <InfoRow label="Status" value={selectedGame.isInstalled ? 'Ready' : 'Not Installed'} />
                    {selectedGame.sizeOnDisk && (
                        <InfoRow label="Size" value={`${(selectedGame.sizeOnDisk / 1073741824).toFixed(1)} GB`} />
                    )}
                    {gameDetails?.details?.releaseDate && (
                        <InfoRow label="Released" value={gameDetails.details.releaseDate} />
                    )}
                </div>

                {/* Launch Options */}
                {selectedGame.isInstalled && (
                    <div className="pt-3 border-t border-void-border/20 space-y-2">
                        <div className="flex items-center gap-1.5 mb-2">
                            <Settings size={10} className="text-white/40" />
                            <span className="text-[9px] font-mono uppercase tracking-widest text-white/40">Launch Options</span>
                        </div>

                        {/* MangoHud Toggle */}
                        <LaunchToggle
                            label="MangoHud"
                            description="Performance overlay"
                            icon={<Activity size={12} />}
                            enabled={selectedGame.mangoHudEnabled ?? false}
                            disabled={isSteamGame}
                            disabledTooltip="Use Steam's launch options"
                            onToggle={async () => {
                                const newValue = !selectedGame.mangoHudEnabled
                                updateGame(selectedGame.id, { mangoHudEnabled: newValue })
                                await window.api?.updateGame(selectedGame.id, { mangoHudEnabled: newValue })
                            }}
                        />

                        {/* GameMode Toggle */}
                        <LaunchToggle
                            label="GameMode"
                            description="CPU governor optimization"
                            icon={<Zap size={12} />}
                            enabled={selectedGame.gamemodeEnabled ?? false}
                            disabled={isSteamGame}
                            disabledTooltip="Use Steam's launch options"
                            onToggle={async () => {
                                const newValue = !selectedGame.gamemodeEnabled
                                updateGame(selectedGame.id, { gamemodeEnabled: newValue })
                                await window.api?.updateGame(selectedGame.id, { gamemodeEnabled: newValue })
                            }}
                        />

                        {/* Gamescope Toggle with Expandable Options */}
                        <div className="space-y-1">
                            <div className="flex items-center gap-2">
                                <LaunchToggle
                                    label="Gamescope"
                                    description="Nested compositor"
                                    icon={<Maximize2 size={12} />}
                                    enabled={selectedGame.gamescope?.enabled ?? false}
                                    disabled={isSteamGame}
                                    disabledTooltip="Use Steam's launch options"
                                    onToggle={async () => {
                                        const newValue = !selectedGame.gamescope?.enabled
                                        const newSettings = { ...selectedGame.gamescope, enabled: newValue }
                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                        await window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                    }}
                                />
                                {selectedGame.gamescope?.enabled && (
                                    <button
                                        onClick={() => setGamescopeExpanded(!gamescopeExpanded)}
                                        className="p-1 rounded bg-void-surface/50 hover:bg-void-surface text-white/30 hover:text-white/60 transition-colors"
                                    >
                                        <motion.div
                                            animate={{ rotate: gamescopeExpanded ? 180 : 0 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <ChevronDown size={12} />
                                        </motion.div>
                                    </button>
                                )}
                            </div>

                            {/* Gamescope Expanded Settings */}
                            <AnimatePresence>
                                {gamescopeExpanded && selectedGame.gamescope?.enabled && (
                                    <motion.div
                                        initial={{ height: 0, opacity: 0 }}
                                        animate={{ height: 'auto', opacity: 1 }}
                                        exit={{ height: 0, opacity: 0 }}
                                        transition={{ duration: 0.2 }}
                                        className="overflow-hidden"
                                    >
                                        <div className="pl-4 pt-2 space-y-2 border-l border-void-border/20 ml-1">
                                            {/* Resolution */}
                                            <div className="grid grid-cols-2 gap-2">
                                                <GamescopeInput
                                                    label="Render W"
                                                    value={selectedGame.gamescope.width}
                                                    placeholder="1280"
                                                    onChange={(v) => {
                                                        const newSettings = { ...selectedGame.gamescope!, width: v }
                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                    }}
                                                />
                                                <GamescopeInput
                                                    label="Render H"
                                                    value={selectedGame.gamescope.height}
                                                    placeholder="720"
                                                    onChange={(v) => {
                                                        const newSettings = { ...selectedGame.gamescope!, height: v }
                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                    }}
                                                />
                                                <GamescopeInput
                                                    label="Output W"
                                                    value={selectedGame.gamescope.outputWidth}
                                                    placeholder="1920"
                                                    onChange={(v) => {
                                                        const newSettings = { ...selectedGame.gamescope!, outputWidth: v }
                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                    }}
                                                />
                                                <GamescopeInput
                                                    label="Output H"
                                                    value={selectedGame.gamescope.outputHeight}
                                                    placeholder="1080"
                                                    onChange={(v) => {
                                                        const newSettings = { ...selectedGame.gamescope!, outputHeight: v }
                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                    }}
                                                />
                                            </div>

                                            {/* Upscaling */}
                                            <div className="space-y-1.5">
                                                <span className="text-[9px] font-mono uppercase tracking-wider text-white/50">Upscaler</span>
                                                <div className="flex gap-1.5 flex-wrap">
                                                    {(['linear', 'nearest', 'fsr', 'nis'] as const).map((filter) => (
                                                        <button
                                                            key={filter}
                                                            onClick={() => {
                                                                const newSettings = { ...selectedGame.gamescope!, filter }
                                                                updateGame(selectedGame.id, { gamescope: newSettings })
                                                                window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                            }}
                                                            className={`px-2.5 py-1.5 text-[10px] font-mono uppercase rounded transition-all ${selectedGame.gamescope?.filter === filter
                                                                ? 'bg-crimson-500/30 text-crimson-400 border border-crimson-500/60'
                                                                : 'bg-void-surface/50 text-white/60 border border-void-border/40 hover:text-white/80 hover:border-void-border/60'
                                                                }`}
                                                        >
                                                            {filter.toUpperCase()}
                                                        </button>
                                                    ))}
                                                </div>
                                            </div>

                                            {/* FSR Sharpness */}
                                            {(selectedGame.gamescope?.filter === 'fsr' || selectedGame.gamescope?.filter === 'nis') && (
                                                <GamescopeInput
                                                    label={`${selectedGame.gamescope.filter.toUpperCase()} Sharpness`}
                                                    value={selectedGame.gamescope.filter === 'fsr' ? selectedGame.gamescope.fsrSharpness : selectedGame.gamescope.nisSharpness}
                                                    placeholder="2"
                                                    onChange={(v) => {
                                                        const key = selectedGame.gamescope?.filter === 'fsr' ? 'fsrSharpness' : 'nisSharpness'
                                                        const newSettings = { ...selectedGame.gamescope!, [key]: v }
                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                    }}
                                                />
                                            )}

                                            {/* FPS Limit */}
                                            <GamescopeInput
                                                label="FPS Limit"
                                                value={selectedGame.gamescope.fpsLimit}
                                                placeholder="60"
                                                onChange={(v) => {
                                                    const newSettings = { ...selectedGame.gamescope!, fpsLimit: v }
                                                    updateGame(selectedGame.id, { gamescope: newSettings })
                                                    window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                }}
                                            />

                                            {/* Boolean Options */}
                                            <div className="grid grid-cols-2 gap-1 pt-1">
                                                <GamescopeMiniToggle
                                                    label="Fullscreen"
                                                    enabled={selectedGame.gamescope.fullscreen ?? false}
                                                    onToggle={() => {
                                                        const newSettings = { ...selectedGame.gamescope!, fullscreen: !selectedGame.gamescope?.fullscreen }
                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                    }}
                                                />
                                                <GamescopeMiniToggle
                                                    label="Borderless"
                                                    enabled={selectedGame.gamescope.borderless ?? false}
                                                    onToggle={() => {
                                                        const newSettings = { ...selectedGame.gamescope!, borderless: !selectedGame.gamescope?.borderless }
                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                    }}
                                                />
                                                <GamescopeMiniToggle
                                                    label="VRR/Adaptive"
                                                    enabled={selectedGame.gamescope.adaptiveSync ?? false}
                                                    onToggle={() => {
                                                        const newSettings = { ...selectedGame.gamescope!, adaptiveSync: !selectedGame.gamescope?.adaptiveSync }
                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                    }}
                                                />
                                                <GamescopeMiniToggle
                                                    label="HDR"
                                                    enabled={selectedGame.gamescope.hdr ?? false}
                                                    onToggle={() => {
                                                        const newSettings = { ...selectedGame.gamescope!, hdr: !selectedGame.gamescope?.hdr }
                                                        updateGame(selectedGame.id, { gamescope: newSettings })
                                                        window.api?.updateGame(selectedGame.id, { gamescope: newSettings })
                                                    }}
                                                />
                                            </div>
                                        </div>
                                    </motion.div>
                                )}
                            </AnimatePresence>
                        </div>
                    </div>
                )}
            </div>

            {/* Bottom Actions */}
            <div className="p-4 border-t border-void-border/30 z-10 flex items-center gap-2">
                <button
                    onClick={() => toggleFavorite(selectedGame.id)}
                    className={`p-2 rounded-lg transition-all duration-200 ${selectedGame.isFavorite
                        ? 'bg-crimson-500/20 text-crimson-500'
                        : 'bg-void-surface/50 text-white/30 hover:text-white/60 hover:bg-void-surface'
                        }`}
                >
                    <Star size={16} className={selectedGame.isFavorite ? 'fill-crimson-500' : ''} />
                </button>

                {selectedGame.steamAppId && (
                    <button
                        onClick={() => window.api?.openSteamStore(selectedGame.steamAppId!)}
                        className="p-2 rounded-lg bg-void-surface/50 text-white/30 hover:text-white/60 hover:bg-void-surface transition-all duration-200"
                    >
                        <ExternalLink size={16} />
                    </button>
                )}

                {selectedGame.isInstalled && (
                    <button
                        onClick={handleDelete}
                        className={`p-2 rounded-lg transition-all duration-200 ml-auto ${isDeleting
                            ? 'bg-red-500/20 text-red-500'
                            : 'bg-void-surface/50 text-white/30 hover:text-red-500 hover:bg-red-500/10'
                            }`}
                    >
                        <Trash2 size={16} />
                    </button>
                )}
            </div>
        </div>
    )
}
