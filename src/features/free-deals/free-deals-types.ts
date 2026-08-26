export type FreeDealStore = 'steam' | 'epic'

export interface FreeDeal {
    id: string               // Source-prefixed, e.g. "steam:3241" / "epic:b467b7d3"
    title: string
    originalPrice: string    // e.g., "$2.99"
    thumbnail: string        // Small store image
    image: string            // Large banner image
    description: string
    claimUrl: string         // URL to claim the game (fallback for Steam, primary for Epic)
    endDate: string          // ISO date, or "N/A" when the source doesn't publish one
    status: string           // "Active" etc.
    steamAppId: string | null  // Steam App ID for opening in Steam app; always null for Epic
    store: FreeDealStore
    /**
     * Epic only. Gateway can't query Epic for ownership, so this is resolved
     * in the main process against the Epic entitlements Heroic imported.
     * Steam ownership is checked live in the renderer instead, so this stays
     * false for Steam deals.
     */
    alreadyOwned: boolean
}

export interface FreeDealsData {
    deals: FreeDeal[]
    fetchedAt: number
}

export interface FetchFreeDealsResult {
    success: boolean
    data?: FreeDealsData
    error?: string
}
