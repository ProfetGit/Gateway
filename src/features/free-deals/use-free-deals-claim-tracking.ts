import React from 'react'
import { checkGameOwned } from './api/check-game-owned'
import { onGameClaimed } from './api/on-game-claimed'

export function useFreeDealsClaimTracking(appIds: string[]) {
    const [claimedIds, setClaimedIds] = React.useState<Set<string>>(new Set())

    const checkOwnership = React.useCallback(async (ids: string[]) => {
        if (ids.length === 0) return
        const newClaimed = new Set<string>()
        for (const appId of ids) {
            const res = await checkGameOwned(appId)
            if (res) {
                newClaimed.add(appId)
            }
        }
        setClaimedIds(newClaimed)
    }, [])

    React.useEffect(() => {
        checkOwnership(appIds)
    // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [appIds.join(',')])

    // Listen for game claimed events (after focus returns)
    React.useEffect(() => {
        let unlisten: (() => void) | undefined
        onGameClaimed((data) => {
            if (data.owned) {
                setClaimedIds(prev => new Set([...prev, data.appId]))
            }
        }).then(fn => { unlisten = fn })
        return () => { unlisten?.() }
    }, [])

    return claimedIds
}
