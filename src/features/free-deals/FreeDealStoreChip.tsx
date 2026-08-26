import type { FreeDealStore } from './free-deals-types'

// With two storefronts in one row, the card has to say where the claim
// actually happens — clicking opens Steam for one and a browser for the other.
const STORE_LABELS: Record<FreeDealStore, string> = {
    steam: 'Steam',
    epic: 'Epic',
}

export function FreeDealStoreChip({ store }: { store: FreeDealStore }) {
    return (
        <span className="px-1.5 py-0.5 rounded border border-white/20 bg-black/60 backdrop-blur-sm text-[10px] font-mono uppercase tracking-wider text-white/80">
            {STORE_LABELS[store]}
        </span>
    )
}
