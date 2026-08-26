import { motion } from 'framer-motion'
import { AlertCircle, Check, Search } from 'lucide-react'

export interface SteamMatchHit {
    appId: string
    name: string
    capsuleUrl?: string
    iconUrl?: string
}

interface SteamMatchResultsProps {
    results: SteamMatchHit[]
    isLoading: boolean
    error?: string
    selectedAppId: string | null
    onSelect: (appId: string) => void
}

export function SteamMatchResults({ results, isLoading, error, selectedAppId, onSelect }: SteamMatchResultsProps) {
    if (isLoading) {
        return (
            <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                    <div
                        key={i}
                        className="h-16 bg-void-surface border border-void-border animate-pulse rounded"
                        style={{ animationDelay: `${i * 60}ms` }}
                    />
                ))}
            </div>
        )
    }

    if (error) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <AlertCircle className="w-7 h-7 text-crimson-500 mb-3" />
                <p className="text-sm text-text-primary">Couldn't search Steam right now</p>
                <p className="text-xs text-text-muted mt-1">{error}</p>
            </div>
        )
    }

    if (results.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center py-10 text-center">
                <Search className="w-7 h-7 text-text-muted mb-3" />
                <p className="text-sm text-text-secondary">No matches found</p>
                <p className="text-xs text-text-muted mt-1">Try a shorter or different name</p>
            </div>
        )
    }

    return (
        <ul className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {results.map((hit, index) => {
                const isSelected = hit.appId === selectedAppId
                return (
                    <motion.li
                        key={hit.appId}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(index * 0.03, 0.2), duration: 0.25, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <button
                            type="button"
                            onClick={() => onSelect(hit.appId)}
                            aria-pressed={isSelected}
                            className={`w-full flex items-center gap-3 p-2 rounded border text-left transition-colors duration-100 ease-out-expo ${
                                isSelected
                                    ? 'border-crimson-500 bg-crimson-500/10'
                                    : 'border-void-border bg-void-surface hover:border-crimson-500/50'
                            }`}
                        >
                            <img
                                src={hit.capsuleUrl ?? `https://steamcdn-a.akamaihd.net/steam/apps/${hit.appId}/header.jpg`}
                                alt=""
                                aria-hidden
                                loading="lazy"
                                className="w-24 h-11 object-cover rounded-sm shrink-0 bg-void-deep"
                                onError={(e) => { e.currentTarget.style.visibility = 'hidden' }}
                            />
                            <span className="min-w-0 flex-1">
                                <span className="block text-sm text-text-primary truncate">{hit.name}</span>
                                <span className="block text-[10px] font-mono text-text-muted mt-0.5">{hit.appId}</span>
                            </span>
                            {isSelected && <Check className="w-4 h-4 text-crimson-500 shrink-0" />}
                        </button>
                    </motion.li>
                )
            })}
        </ul>
    )
}
