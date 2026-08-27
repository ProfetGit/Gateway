import { useState, useRef, useEffect } from 'react'
import { getGameNews } from '@/features/game-library/api/get-game-news'
import { getMetadataAppId } from '@/features/game-library/get-metadata-app-id'
import type { Game } from '@/features/game-library/game-library-types'
import type { FetchNewsResult } from '@/features/game-library/game-news-types'

const NEWS_COUNT = 10

/**
 * Steam announcements, fetched once the detail overlay is open. `enabled`
 * replaced a tab-name check when the tabs went away — the single-view panel
 * shows news, achievements and details at once, so all three fetch together.
 * Keyed on the resolved metadata appid — the news API needs neither a key nor
 * ownership, so matched non-Steam games get real announcements too.
 */
export function useGameNewsFetch(selectedGame: Game | null, enabled: boolean) {
    const [newsData, setNewsData] = useState<FetchNewsResult | null>(null)
    const [newsLoading, setNewsLoading] = useState(false)
    const fetchedRef = useRef<string | null>(null)

    const appId = getMetadataAppId(selectedGame)

    useEffect(() => {
        setNewsData(null)
        fetchedRef.current = null
    }, [selectedGame?.id])

    useEffect(() => {
        if (!enabled || !appId) return
        if (fetchedRef.current === appId) return

        fetchedRef.current = appId
        setNewsLoading(true)

        getGameNews(appId, NEWS_COUNT)
            .then(result => setNewsData(result))
            .catch(() => setNewsData({ success: false, news: [], totalCount: 0 }))
            .finally(() => setNewsLoading(false))
    }, [enabled, appId])

    return { newsData, newsLoading }
}
