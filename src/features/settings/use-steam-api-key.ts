import { useCallback, useEffect, useState } from 'react'
import { getSteamApiKey } from '@/features/onboarding/api/get-steam-api-key'
import { setSteamApiKey } from '@/features/onboarding/api/set-steam-api-key'

/**
 * The Steam API key field's own state and handlers, lifted out of
 * SettingsPanel so that file stays under the 200-line cap.
 */
export function useSteamApiKey(isOpen: boolean) {
    const [apiKey, setApiKey] = useState('')
    const [apiKeySaved, setApiKeySaved] = useState(false)
    const [apiKeyError, setApiKeyError] = useState<string | null>(null)
    const [hasStoredKey, setHasStoredKey] = useState(false)
    const [keyExpanded, setKeyExpanded] = useState(false)

    // Reset every time the panel opens — the field must never show a
    // half-typed key from the last visit.
    useEffect(() => {
        if (!isOpen) return
        getSteamApiKey().then((k) => {
            setHasStoredKey(!!k)
            setApiKey('')
            setApiKeySaved(false)
            setApiKeyError(null)
            setKeyExpanded(false)
        }).catch(() => {})
    }, [isOpen])

    const onSaveKey = useCallback(async () => {
        const trimmed = apiKey.trim()
        if (!trimmed) { setApiKeyError('Paste a key first'); return }
        if (!/^[A-F0-9]{32}$/i.test(trimmed)) { setApiKeyError('Keys are 32 hex characters'); return }
        setApiKeyError(null)
        const result = await setSteamApiKey(trimmed)
        if (result?.success) {
            setHasStoredKey(true)
            setApiKey('')
            setApiKeySaved(true)
            setTimeout(() => setApiKeySaved(false), 2000)
        }
    }, [apiKey])

    const onClearKey = useCallback(async () => {
        await setSteamApiKey('')
        setHasStoredKey(false)
        setApiKey('')
    }, [])

    return {
        apiKey, setApiKey,
        apiKeySaved, setApiKeySaved,
        apiKeyError, setApiKeyError,
        hasStoredKey,
        keyExpanded, setKeyExpanded,
        onSaveKey, onClearKey,
    }
}
