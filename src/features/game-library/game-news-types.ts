// Steam announcement feed, rendered by the detail panel's news band.
export interface NewsItem {
    gid: string
    title: string
    url: string
    author: string
    contents: string
    feedlabel: string
    feedname: string
    date: number
    appId: string
}

export interface FetchNewsResult {
    success: boolean
    news: NewsItem[]
    totalCount: number
    error?: string
    errorCode?: 'NO_STEAM_APP' | 'API_ERROR' | 'NETWORK_ERROR'
}
