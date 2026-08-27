import { useCallback, useEffect, useRef, useState } from 'react'
import { pickSteamMatch } from './pick-steam-match'
import { useSteamAppSearch } from './use-steam-app-search'
import type { SteamMatchHit } from './components/SteamMatchResults'

/**
 * Looks a title up on Steam and links it when the match is unambiguous.
 *
 * Shared by Add Game and the install wizard: both derive a name from a filename
 * and both want art, news and achievement definitions attached without making
 * the user go hunting for the match afterwards.
 */
export function useSteamAutoMatch(title: string, enabled: boolean) {
    const [linked, setLinked] = useState<SteamMatchHit | null>(null)
    const [suggestions, setSuggestions] = useState<SteamMatchHit[]>([])
    // Set once the user picks or clears a match by hand, so the auto-matcher
    // stops overriding a decision they already made.
    const [userChose, setUserChose] = useState(false)
    const lastAutoLinked = useRef<string | null>(null)

    const { results, isLoading } = useSteamAppSearch(title, enabled && !userChose)

    useEffect(() => {
        if (userChose) return
        const choice = pickSteamMatch(title, results)
        setSuggestions(choice.suggestions)
        if (choice.exact) {
            if (lastAutoLinked.current !== choice.exact.appId) {
                lastAutoLinked.current = choice.exact.appId
                setLinked(choice.exact)
            }
        } else {
            setLinked(null)
        }
    }, [results, title, userChose])

    const chooseMatch = useCallback((hit: SteamMatchHit | null) => {
        setLinked(hit)
        setUserChose(true)
    }, [])

    /** Call when the title is edited by hand — the name is the query. */
    const releaseMatch = useCallback(() => {
        setUserChose(false)
        lastAutoLinked.current = null
    }, [])

    const reset = useCallback(() => {
        setLinked(null)
        setSuggestions([])
        setUserChose(false)
        lastAutoLinked.current = null
    }, [])

    return {
        linked, suggestions, isSearching: isLoading && !userChose,
        chooseMatch, releaseMatch, reset,
    }
}
