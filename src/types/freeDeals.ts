export interface FreeDeal {
    id: number
    title: string
    originalPrice: string    // e.g., "$2.99"
    thumbnail: string        // Small image from GamerPower
    image: string            // Large image from GamerPower
    description: string
    claimUrl: string         // URL to claim the game (fallback)
    endDate: string          // ISO date string
    status: string           // "Active" etc.
    steamAppId: string | null  // Steam App ID for opening in Steam app
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
