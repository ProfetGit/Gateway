import { Check } from 'lucide-react'
import type { SteamMatchHit } from './SteamMatchResults'

const STEAM_CDN = 'https://steamcdn-a.akamaihd.net/steam/apps'

interface SteamSuggestionListProps {
    results: SteamMatchHit[]
    isLoading: boolean
    /** Index the keyboard is on, or -1. */
    activeIndex: number
    linkedAppId?: string
    onPick: (hit: SteamMatchHit) => void
    onHover: (index: number) => void
    listId: string
}

export function SteamSuggestionList({
    results, isLoading, activeIndex, linkedAppId, onPick, onHover, listId,
}: SteamSuggestionListProps) {
    if (isLoading && results.length === 0) {
        return (
            <div className="p-2 space-y-1.5">
                {Array.from({ length: 3 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-12 bg-void-surface animate-pulse rounded"
                        style={{ animationDelay: `${i * 60}ms` }}
                    />
                ))}
            </div>
        )
    }

    if (results.length === 0) {
        return (
            <p className="px-3 py-4 text-xs text-text-muted">
                Nothing on Steam by that name. Keep typing, or just use your own title.
            </p>
        )
    }

    return (
        <ul id={listId} role="listbox" className="max-h-64 overflow-y-auto py-1">
            {results.map((hit, index) => (
                <li key={hit.appId} role="option" aria-selected={index === activeIndex}>
                    <button
                        type="button"
                        // onMouseDown, not onClick: the input's blur fires first
                        // and would close the list before the click lands.
                        onMouseDown={(e) => { e.preventDefault(); onPick(hit) }}
                        onMouseEnter={() => onHover(index)}
                        className={`w-full flex items-center gap-3 px-3 py-2 text-left transition-colors duration-100 ${
                            index === activeIndex ? 'bg-crimson-500/10' : 'hover:bg-void-surface'
                        }`}
                    >
                        <img
                            // Steam's own capsule first: the guessable header
                            // path 404s for newer apps, which is most of what
                            // a fresh search turns up.
                            src={hit.capsuleUrl ?? `${STEAM_CDN}/${hit.appId}/header.jpg`}
                            alt=""
                            aria-hidden
                            loading="lazy"
                            className="w-20 h-9 object-cover rounded-sm shrink-0 bg-void-deep"
                            onError={(e) => {
                                const img = e.currentTarget
                                if (hit.iconUrl && img.src !== hit.iconUrl) img.src = hit.iconUrl
                                else img.style.visibility = 'hidden'
                            }}
                        />
                        <span className="min-w-0 flex-1">
                            <span className="block text-sm text-text-primary truncate">{hit.name}</span>
                            <span className="block text-[10px] font-mono text-text-ghost">{hit.appId}</span>
                        </span>
                        {hit.appId === linkedAppId && <Check className="w-4 h-4 text-crimson-500 shrink-0" />}
                    </button>
                </li>
            ))}
        </ul>
    )
}
