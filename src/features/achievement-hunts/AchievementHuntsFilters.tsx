import { ArrowUpDown } from 'lucide-react'

export type FilterBand = 'all' | 'inProgress' | 'almostDone' | 'completed' | 'untouched'
export type SortMode = 'pctDesc' | 'pctAsc' | 'recent' | 'title'

const FILTER_CHIPS: Array<{ id: FilterBand; label: string; accent: string }> = [
    { id: 'all',         label: 'All',         accent: 'text-white/80 border-white/30 hover:border-white/60' },
    { id: 'inProgress',  label: 'In Progress', accent: 'text-crimson-300 border-crimson-700/40 hover:border-crimson-500/70' },
    { id: 'almostDone',  label: 'Almost Done', accent: 'text-amber-300 border-amber-700/40 hover:border-amber-500/70' },
    { id: 'completed',   label: 'Completed',   accent: 'text-emerald-300 border-emerald-700/40 hover:border-emerald-500/70' },
    { id: 'untouched',   label: 'Untouched',   accent: 'text-white/50 border-white/15 hover:border-white/40' },
]

const SORT_CHIPS: Array<{ id: SortMode; label: string }> = [
    { id: 'pctDesc', label: '% Desc' },
    { id: 'pctAsc',  label: '% Asc' },
    { id: 'recent',  label: 'Recent' },
    { id: 'title',   label: 'A→Z' },
]

export type AchievementHuntsFiltersProps = {
    band: FilterBand
    setBand: (b: FilterBand) => void
    sort: SortMode
    setSort: (s: SortMode) => void
}

export function AchievementHuntsFilters({ band, setBand, sort, setSort }: AchievementHuntsFiltersProps) {
    return (
        <div className="relative px-8 py-5 border-b border-white/10 shrink-0 space-y-3 z-10">
            <div className="flex items-center gap-2 flex-wrap">
                {FILTER_CHIPS.map((chip) => {
                    const active = band === chip.id
                    return (
                        <button
                            key={chip.id}
                            onClick={() => setBand(chip.id)}
                            className={`
                                px-3 py-1.5 text-[10px] font-mono font-black uppercase tracking-[0.15em]
                                border rounded-sm transition-[color,border-color,background-color] duration-200 ease-out
                                ${active
                                    ? `${chip.accent.split(' hover:')[0]} bg-white/5`
                                    : `text-white/30 border-white/10 hover:${chip.accent.split(' ').slice(0,1).join('')} ${chip.accent.split(' ').slice(2).join(' ')}`
                                }
                            `}
                        >
                            {chip.label}
                        </button>
                    )
                })}
            </div>

            <div className="flex items-center gap-2 flex-wrap">
                <span className="text-[10px] font-mono font-bold text-white/40 uppercase tracking-widest flex items-center gap-1.5">
                    <ArrowUpDown className="w-3 h-3" />
                    Sort
                </span>
                {SORT_CHIPS.map((chip) => {
                    const active = sort === chip.id
                    return (
                        <button
                            key={chip.id}
                            onClick={() => setSort(chip.id)}
                            className={`
                                px-2.5 py-1 text-[10px] font-mono font-bold uppercase tracking-[0.12em]
                                border rounded-sm transition-[color,border-color,background-color] duration-200 ease-out
                                ${active
                                    ? 'text-crimson-300 border-crimson-700/50 bg-crimson-500/10'
                                    : 'text-white/40 border-white/10 hover:text-white/70 hover:border-white/30'
                                }
                            `}
                        >
                            {chip.label}
                        </button>
                    )
                })}
            </div>
        </div>
    )
}
