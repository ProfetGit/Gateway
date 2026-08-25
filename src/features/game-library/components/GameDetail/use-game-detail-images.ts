import { useState, useEffect } from 'react'
import { getMetadataAppId } from '@/features/game-library/get-metadata-app-id'
import type { Game } from '@/features/game-library/game-library-types'

/**
 * Cover + banner sources for the detail overlay, reset whenever the selected
 * game changes. Banner prefers locally-mirrored art (non-Steam shortcuts carry
 * real Steam grid art copied out of Steam's own cache) before falling back to
 * guessing a CDN URL from the resolved metadata appid.
 */
export function useGameDetailImages(selectedGame: Game | null) {
    const [imgSrc, setImgSrc] = useState<string | undefined>(undefined)
    const [bannerSrc, setBannerSrc] = useState<string | undefined>(undefined)

    // selectedGame is intentionally omitted; we only re-run on id change.
    useEffect(() => {
        if (!selectedGame) return

        const cover = selectedGame.localCoverPath
            ? `gateway://cover/${selectedGame.localCoverPath}`
            : selectedGame.coverUrl
        setImgSrc(cover)

        const metadataAppId = getMetadataAppId(selectedGame)
        if (selectedGame.heroImageUrl) {
            setBannerSrc(selectedGame.heroImageUrl)
        } else if (metadataAppId) {
            setBannerSrc(`https://steamcdn-a.akamaihd.net/steam/apps/${metadataAppId}/library_hero.jpg`)
        } else {
            setBannerSrc(undefined)
        }
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [selectedGame?.id])

    return { imgSrc, bannerSrc, setImgSrc, setBannerSrc }
}
