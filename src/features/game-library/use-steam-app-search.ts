import { useEffect, useState } from 'react'
import { searchSteamApps } from './api/search-steam-apps'
import type { SteamMatchHit } from './components/SteamMatchResults'

// Steam's own search endpoint rejects anything shorter, and one keystroke
// would match half the catalogue anyway.
const MIN_QUERY_LENGTH = 2
const DEBOUNCE_MS = 300

/**
 * Debounced Steam catalogue search. Shared by the Steam-match modal and the
 * title field's suggestion dropdown so both get the same debounce, the same
 * minimum length, and the same main-process 10-minute cache.
 */
export function useSteamAppSearch(query: string, enabled: boolean) {
    const [results, setResults] = useState<SteamMatchHit[]>([])
    const [isLoading, setIsLoading] = useState(false)
    const [error, setError] = useState<string | undefined>()

    useEffect(() => {
        if (!enabled) return

        const trimmed = query.trim()
        if (trimmed.length < MIN_QUERY_LENGTH) {
            setResults([])
            setIsLoading(false)
            setError(undefined)
            return
        }

        setIsLoading(true)
        let cancelled = false

        const timer = setTimeout(async () => {
            try {
                const res = await searchSteamApps(trimmed)
                if (cancelled) return
                setResults(res.results)
                setError(res.success ? undefined : (res.error ?? 'Search failed'))
            } catch {
                if (cancelled) return
                setResults([])
                setError('Search failed')
            } finally {
                if (!cancelled) setIsLoading(false)
            }
        }, DEBOUNCE_MS)

        return () => {
            cancelled = true
            clearTimeout(timer)
        }
    }, [query, enabled])

    return { results, isLoading, error }
}
