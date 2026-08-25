import React from 'react'
import { Play, Download, Trash2, Info, Star, ExternalLink, StarOff, Link2 } from 'lucide-react'
import type { ContextMenuItem } from '@/components/ui/context-menu/context-menu-store'
import { useGameStore } from '../game-store'
import { useSteamMatchStore } from '../steam-match-store'
import { openSteamStore } from '@/lib/api/navigation'
import { uninstallGame } from '../api/uninstall-game'
import type { Game } from '../game-library-types'

interface GameCardMenuActions {
    onPlay: () => void
    onInstall: () => void
}

const icon = (Component: typeof Play) => React.createElement(Component, { className: 'w-4 h-4' })

/**
 * Builds the right-click menu for a game card. Extracted from GameCard so that
 * file stays under the 200-line cap.
 */
export function useGameCardMenu(game: Game, { onPlay, onInstall }: GameCardMenuActions): () => ContextMenuItem[] {
    const { openDetail, toggleFavorite, deleteGame } = useGameStore()
    const openMatch = useSteamMatchStore((s) => s.open)

    return () => [
        {
            label: 'Play',
            icon: icon(Play),
            onClick: onPlay,
        },
        {
            label: game.isFavorite ? 'Remove from Favorites' : 'Add to Favorites',
            icon: icon(game.isFavorite ? StarOff : Star),
            onClick: () => toggleFavorite(game.id),
        },
        {
            label: 'View Details',
            icon: icon(Info),
            onClick: () => openDetail(game),
        },
        ...(game.steamAppId
            ? [{
                label: 'View in Steam Store',
                icon: icon(ExternalLink),
                onClick: () => openSteamStore(game.steamAppId!),
            }]
            : [{
                label: game.metadataAppId ? 'Change Steam match' : 'Match to Steam game',
                icon: icon(Link2),
                onClick: () => openMatch(game),
            }]),
        {
            label: game.isInstalled ? 'Uninstall' : 'Install',
            icon: icon(Download),
            onClick: () => {
                if (game.isInstalled) {
                    if (game.steamAppId) uninstallGame(game)
                } else {
                    onInstall()
                }
            },
        },
        {
            label: 'Remove from Library',
            icon: icon(Trash2),
            danger: true,
            onClick: () => deleteGame(game.id),
        },
    ]
}
