import { useState, useRef, useEffect } from 'react'
import { getGameDetails } from '@/features/game-library/api/get-game-details'
import { getMetadataAppId } from '@/features/game-library/get-metadata-app-id'
import type { FetchGameDetailsResult, Game } from '@/features/game-library/game-library-types'

/**
 * Steam store details for the overview tab. Works off the resolved metadata
 * appid, so a non-Steam game matched to a Steam title gets real details —
 * the store API needs neither a key nor ownership.
 */
export function useGameDetailsFetch(selectedGame: Game | null) {
    const [gameDetails, setGameDetails] = useState<FetchGameDetailsResult | null>(null)
    const [detailsLoading, setDetailsLoading] = useState(false)
    const fetchedRef = useRef<string | null>(null)

    const appId = getMetadataAppId(selectedGame)

    useEffect(() => {
        setGameDetails(null)
        fetchedRef.current = null
    }, [selectedGame?.id])

    useEffect(() => {
        if (!appId) return
        if (fetchedRef.current === appId) return

        fetchedRef.current = appId
        setDetailsLoading(true)

        getGameDetails(appId)
            .then(result => setGameDetails(result))
            .catch(error => {
                console.error('Failed to fetch game details:', error)
                setGameDetails({ success: false, details: null, error: 'Failed' })
            })
            .finally(() => setDetailsLoading(false))
    }, [appId])

    return { gameDetails, detailsLoading }
}
