import { Check, Loader2, Search } from 'lucide-react'
import type { SteamMatchHit } from './SteamMatchResults'
import { AddGameCoverPreview } from './AddGameCoverPreview'

export type AddGameReviewProps = {
    title: string
    onTitle: (v: string) => void
    executablePath: string
    onBrowseExecutable: () => void
    coverUrl: string
    onBrowseCover: () => void
    linked: SteamMatchHit | null
    suggestions: SteamMatchHit[]
    isSearching: boolean
    onLink: (hit: SteamMatchHit | null) => void
}

const SUBTLE_LINK =
    'text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/40 hover:text-white border-b border-transparent hover:border-crimson-500 transition-[color,border-color] duration-100 ease-out-expo'

/**
 * Step two is a preview, not a form: the file gave us a name, the name gave us
 * a Steam match, the match gives us the art. Everything here is editable and
 * nothing is required, so the fast path is to read it and press the button.
 */
export function AddGameReview({
    title, onTitle, executablePath, onBrowseExecutable,
    coverUrl, onBrowseCover, linked, suggestions, isSearching, onLink,
}: AddGameReviewProps) {
    return (
        <div className="grid grid-cols-[150px_1fr] gap-5">
            <div>
                <AddGameCoverPreview
                    title={title}
                    coverUrl={coverUrl}
                    linkedAppId={linked?.appId}
                    capsuleUrl={linked?.capsuleUrl}
                />
                <button type="button" onClick={onBrowseCover} className={`${SUBTLE_LINK} mt-2.5 w-full text-center`}>
                    {coverUrl ? 'Change cover' : 'Choose a cover'}
                </button>
            </div>

            <div className="min-w-0">
                <label className="block text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32">
                    Name
                </label>
                <input
                    value={title}
                    onChange={(e) => onTitle(e.target.value)}
                    placeholder="What do you call it?"
                    autoFocus
                    className="mt-1.5 w-full bg-transparent border-0 border-b border-void-border/80 pb-1.5 font-display font-black italic text-[21px] tracking-[-0.02em] text-white placeholder:text-white/20 focus:outline-none focus:border-crimson-500 transition-colors duration-100 ease-out-expo"
                />

                <div className="mt-3 min-h-[18px]">
                    {isSearching ? (
                        <p className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/35">
                            <Loader2 className="w-3 h-3 animate-spin" />
                            Looking it up on Steam
                        </p>
                    ) : linked ? (
                        <p className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-emerald-400">
                            <Check className="w-3 h-3" />
                            Found on Steam · cover and achievements included
                        </p>
                    ) : (
                        <p className="flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.14em] text-white/35">
                            <Search className="w-3 h-3" />
                            {suggestions.length > 0
                                ? 'Not sure which one — pick it, or keep the name as it is'
                                : 'Not found on Steam. The name you type is what we use.'}
                        </p>
                    )}
                </div>

                {linked ? (
                    <button type="button" onClick={() => onLink(null)} className={`${SUBTLE_LINK} mt-2.5`}>
                        Not this game?
                    </button>
                ) : suggestions.length > 0 && (
                    <div className="flex flex-wrap gap-2 mt-2.5">
                        {suggestions.map((hit) => (
                            <button
                                key={hit.appId}
                                type="button"
                                onClick={() => onLink(hit)}
                                className="px-2.5 py-1.5 border border-void-border text-[10px] font-mono font-bold tracking-[0.1em] text-white/60 hover:text-white hover:border-crimson-500 transition-[color,border-color] duration-100 ease-out-expo"
                            >
                                {hit.name}
                            </button>
                        ))}
                    </div>
                )}

                <div className="flex items-center gap-3 mt-4 pt-3.5 border-t border-void-border/60">
                    <div className="min-w-0 flex-1">
                        <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32">
                            Starts from
                        </p>
                        {/* Truncating a path from the LEFT keeps the filename, which is
                            the part that identifies it. `dir=rtl` does that, but on its
                            own it also reorders the leading slash to the end — <bdi>
                            isolates the text so it still reads left to right. */}
                        <p
                            dir="rtl"
                            className="mt-1 text-left text-[11px] font-mono text-white/50 truncate"
                            title={executablePath}
                        >
                            <bdi>
                                {executablePath || 'Nothing picked — this game will be listed but not playable'}
                            </bdi>
                        </p>
                    </div>
                    <button type="button" onClick={onBrowseExecutable} className={SUBTLE_LINK}>
                        {executablePath ? 'Change' : 'Pick a file'}
                    </button>
                </div>
            </div>
        </div>
    )
}
