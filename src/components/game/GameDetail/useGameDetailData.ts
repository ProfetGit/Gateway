import { useState, useRef, useEffect } from 'react'
import {
    FetchAchievementsResult,
    FetchNewsResult,
    FetchGameDetailsResult,
    Game
} from '../../../types/game'

interface UseGameDetailDataReturn {
    achievementsData: FetchAchievementsResult | null
    achievementsLoading: boolean
    newsData: FetchNewsResult | null
    newsLoading: boolean
    gameDetails: FetchGameDetailsResult | null
    detailsLoading: boolean
    imgSrc: string | undefined
    bannerSrc: string | undefined
    setImgSrc: React.Dispatch<React.SetStateAction<string | undefined>>
    setBannerSrc: React.Dispatch<React.SetStateAction<string | undefined>>
}

export function useGameDetailData(selectedGame: Game | null, activeTab: string): UseGameDetailDataReturn {
    // Achievements cache
    const [achievementsData, setAchievementsData] = useState<FetchAchievementsResult | null>(null)
    const [achievementsLoading, setAchievementsLoading] = useState(false)
    const fetchedAchievementsRef = useRef<string | null>(null)

    // News cache
    const [newsData, setNewsData] = useState<FetchNewsResult | null>(null)
    const [newsLoading, setNewsLoading] = useState(false)
    const fetchedNewsRef = useRef<string | null>(null)

    // Game details cache
    const [gameDetails, setGameDetails] = useState<FetchGameDetailsResult | null>(null)
    const [detailsLoading, setDetailsLoading] = useState(false)
    const fetchedDetailsRef = useRef<string | null>(null)

    // Images
    const [imgSrc, setImgSrc] = useState<string | undefined>(undefined)
    const [bannerSrc, setBannerSrc] = useState<string | undefined>(undefined)

    // Reset cache when game changes
    useEffect(() => {
        setAchievementsData(null)
        setNewsData(null)
        setGameDetails(null)
        fetchedAchievementsRef.current = null
        fetchedNewsRef.current = null
        fetchedDetailsRef.current = null

        // Setup images
        if (selectedGame) {
            // Cover Art - prioritization: local -> remote
            const cover = selectedGame.localCoverPath
                ? `gateway://cover/${selectedGame.localCoverPath}`
                : selectedGame.coverUrl
            setImgSrc(cover)

            // Banner Search - prioritization: steam cdn -> explicit heroImageUrl -> undefined
            if (selectedGame.steamAppId) {
                setBannerSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${selectedGame.steamAppId}/library_hero.jpg`)
            } else if (selectedGame.heroImageUrl) {
                setBannerSrc(selectedGame.heroImageUrl)
            } else {
                setBannerSrc(undefined)
            }
        }
    }, [selectedGame?.id])

    // Fetch Details
    useEffect(() => {
        if (!selectedGame?.steamAppId) return
        if (fetchedDetailsRef.current === selectedGame.steamAppId) return

        fetchedDetailsRef.current = selectedGame.steamAppId
        setDetailsLoading(true)

        window.api?.getGameDetails(selectedGame.steamAppId)
            .then(result => setGameDetails(result))
            .catch(error => {
                console.error('Failed to fetch game details:', error)
                setGameDetails({ success: false, details: null, error: 'Failed' })
            })
            .finally(() => setDetailsLoading(false))
    }, [selectedGame?.steamAppId])

    // Fetch Achievements
    useEffect(() => {
        if (activeTab !== 'achievements' || !selectedGame?.steamAppId) return
        if (fetchedAchievementsRef.current === selectedGame.steamAppId) return

        fetchedAchievementsRef.current = selectedGame.steamAppId
        setAchievementsLoading(true)

        window.api?.getAchievements(selectedGame.steamAppId)
            .then(result => setAchievementsData(result))
            .catch(() => setAchievementsData({ success: false, achievements: [], totalAchievements: 0, unlockedCount: 0 }))
            .finally(() => setAchievementsLoading(false))
    }, [activeTab, selectedGame?.steamAppId])

    // Fetch News
    useEffect(() => {
        if (activeTab !== 'patchnotes' || !selectedGame?.steamAppId) return
        if (fetchedNewsRef.current === selectedGame.steamAppId) return

        fetchedNewsRef.current = selectedGame.steamAppId
        setNewsLoading(true)

        window.api?.getGameNews(selectedGame.steamAppId, 10)
            .then(result => setNewsData(result))
            .catch(() => setNewsData({ success: false, news: [], totalCount: 0 }))
            .finally(() => setNewsLoading(false))
    }, [activeTab, selectedGame?.steamAppId])

    return {
        achievementsData,
        achievementsLoading,
        newsData,
        newsLoading,
        gameDetails,
        detailsLoading,
        imgSrc,
        bannerSrc,
        setImgSrc,
        setBannerSrc
    }
}
