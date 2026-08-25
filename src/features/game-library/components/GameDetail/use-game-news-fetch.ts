import { useState, useRef, useEffect } from 'react'
import { getGameNews } from '@/features/game-library/api/get-game-news'
import { getMetadataAppId } from '@/features/game-library/get-metadata-app-id'
import type { FetchNewsResult, Game } from '@/features/game-library/game-library-types'

const NEWS_COUNT = 10

/**
 * Steam announcements for the news tab, lazily fetched when that tab opens.
 * Keyed on the resolved metadata appid — the news API needs neither a key nor
 * ownership, so matched non-Steam games get real announcements too.
 */
export function useGameNewsFetch(selectedGame: Game | null, activeTab: string) {
    const [newsData, setNewsData] = useState<FetchNewsResult | null>(null)
    const [newsLoading, setNewsLoading] = useState(false)
    const fetchedRef = useRef<string | null>(null)

    const appId = getMetadataAppId(selectedGame)

    useEffect(() => {
        setNewsData(null)
        fetchedRef.current = null
    }, [selectedGame?.id])

    useEffect(() => {
        if (activeTab !== 'patchnotes' || !appId) return
        if (fetchedRef.current === appId) return

        fetchedRef.current = appId
        setNewsLoading(true)

        getGameNews(appId, NEWS_COUNT)
            .then(result => setNewsData(result))
            .catch(() => setNewsData({ success: false, news: [], totalCount: 0 }))
            .finally(() => setNewsLoading(false))
    }, [activeTab, appId])

    return { newsData, newsLoading }
}
