export interface TrendingGame {
    id: number
    name: string
    headerImage: string
    capsuleImage?: string
    discountPercent?: number
    originalPrice?: string
    finalPrice?: string
    windowsAvailable: boolean
    linuxAvailable: boolean
    macAvailable: boolean
}

export interface TrendingData {
    games: TrendingGame[]
    fetchedAt: number
    source: 'top_sellers' | 'specials' | 'new_releases'
}

export interface FetchTrendingResult {
    success: boolean
    data?: TrendingData
    error?: string
}
