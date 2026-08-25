import { Trash2 } from 'lucide-react'

export type DangerZoneSectionProps = {
    onClear: () => void
}

export function DangerZoneSection({ onClear }: DangerZoneSectionProps) {
    return (
        <div className="pt-4 border-t border-white/5 flex items-center justify-between">
            <div>
                <div className="font-mono text-[11px] uppercase tracking-widest text-white/50 font-bold">Clear library</div>
                <div className="font-mono text-[10px] text-white/30 mt-0.5">Removes all games. Cannot be undone.</div>
            </div>
            <button
                onClick={onClear}
                className="px-3 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 font-mono text-[10px] uppercase tracking-widest font-bold transition-colors duration-100 flex items-center gap-1.5"
            >
                <Trash2 className="w-3 h-3" />
                Clear
            </button>
        </div>
    )
}
