import type { FetchAchievementsResult } from '@/features/achievements/api/achievements-schema'
import type {
    FetchNewsResult,
    FetchGameDetailsResult,
    Game
} from '@/features/game-library/game-library-types'
import { useGameDetailImages } from './use-game-detail-images'
import { useGameDetailsFetch } from './use-game-details-fetch'
import { useGameNewsFetch } from './use-game-news-fetch'
import { useGameAchievements } from './use-game-achievements'

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
    toggleAchievement?: (apiname: string) => void
    isManualAchievements: boolean
}

/**
 * Composes the detail overlay's four independent data concerns. Each sub-hook
 * owns its own cache and reset; this exists to keep GameDetail's call site
 * unchanged.
 */
export function useGameDetailData(selectedGame: Game | null, activeTab: string): UseGameDetailDataReturn {
    const { imgSrc, bannerSrc, setImgSrc, setBannerSrc } = useGameDetailImages(selectedGame)
    const { gameDetails, detailsLoading } = useGameDetailsFetch(selectedGame)
    const { newsData, newsLoading } = useGameNewsFetch(selectedGame, activeTab)
    const { achievementsData, achievementsLoading, toggleAchievement, isManual } =
        useGameAchievements(selectedGame, activeTab)

    return {
        achievementsData,
        achievementsLoading,
        toggleAchievement,
        isManualAchievements: isManual,
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
