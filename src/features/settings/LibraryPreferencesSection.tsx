import { RefreshCw } from 'lucide-react'

export type LibraryStats = { total: number, installed: number, sources: { key: string, label: string, count: number }[] }

export type LibraryPreferencesSectionProps = {
    stats: LibraryStats
    isFetching: boolean
    canRefresh: boolean
    onRefresh: () => void
}

export function LibraryPreferencesSection({ stats, isFetching, canRefresh, onRefresh }: LibraryPreferencesSectionProps) {
    const showSourceCards = stats.sources.length > 1
    const gridCols = stats.sources.length === 2 ? 'grid-cols-2' : 'grid-cols-3'

    return (
        <div className="space-y-6">
            {/* Headline numbers */}
            <div className="bg-white/5 border border-white/10 p-5">
                <div className="flex items-baseline gap-6">
                    <div>
                        <div className="text-4xl font-display font-black italic tracking-tighter text-white leading-none">
                            {stats.total}
                        </div>
                        <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-2">
                            Games
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div>
                        <div className="text-4xl font-display font-black italic tracking-tighter text-crimson-500 leading-none">
                            {stats.installed}
                        </div>
                        <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-2">
                            Installed
                        </div>
                    </div>
                    {!showSourceCards && stats.sources[0] && (
                        <>
                            <div className="w-px h-10 bg-white/10" />
                            <div>
                                <div className="text-4xl font-display font-black italic tracking-tighter text-white/80 leading-none">
                                    {stats.sources[0].count}
                                </div>
                                <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-2">
                                    From {stats.sources[0].label}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Source breakdown only when multiple sources active */}
            {showSourceCards && (
                <div className={`grid gap-3 ${gridCols}`}>
                    {stats.sources.map((s, i) => (
                        <div key={s.key} className="bg-white/5 border border-white/10 p-4">
                            <div className={`text-2xl font-display font-black italic tracking-tighter mb-1 ${i === 0 ? 'text-white' : 'text-crimson-500'}`}>
                                {s.count}
                            </div>
                            <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase">
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
                <button
                    onClick={onRefresh}
                    disabled={isFetching || !canRefresh}
                    className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-crimson-600 border border-crimson-500 hover:bg-crimson-500 text-white font-display font-black italic tracking-wider uppercase text-base transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    {isFetching ? "Refreshing..." : "Refresh Library"}
                </button>
                {!canRefresh && (
                    <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest text-center">
                        Sign in to Steam first
                    </p>
                )}
            </div>
        </div>
    )
}
