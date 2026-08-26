import { useEffect, useRef, useState } from 'react'
import { Link2, X } from 'lucide-react'
import { FIELD_HINT, FIELD_INPUT, FIELD_LABEL } from '@/components/ui/form/field-styles'
import { useSteamAppSearch } from '../use-steam-app-search'
import { SteamSuggestionList } from './SteamSuggestionList'
import type { SteamMatchHit } from './SteamMatchResults'

interface SteamTitleFieldProps {
    value: string
    onChange: (title: string) => void
    /** The Steam appid this title is linked to, or undefined. */
    linkedAppId?: string
    onLink: (hit: SteamMatchHit | null) => void
    label?: string
    placeholder?: string
}

/**
 * Title input that suggests Steam games as you type. Picking one links the
 * game to that appid, which is what art, store details, news and achievement
 * definitions all resolve through — so the alternative is adding the game
 * blind and then hunting for the Steam match separately.
 *
 * Linking is `metadataAppId`, never `steamAppId`: the user does not own this
 * game on Steam, and routing a launch through it would fail silently.
 */
export function SteamTitleField({
    value, onChange, linkedAppId, onLink, label = 'Title', placeholder = 'Game title',
}: SteamTitleFieldProps) {
    const [isOpen, setIsOpen] = useState(false)
    const [activeIndex, setActiveIndex] = useState(-1)
    const [linkedName, setLinkedName] = useState<string | null>(null)
    const containerRef = useRef<HTMLDivElement>(null)

    // Don't search while the field is showing a title the user already linked.
    const { results, isLoading } = useSteamAppSearch(value, isOpen)

    useEffect(() => {
        setActiveIndex(-1)
    }, [results])

    useEffect(() => {
        if (!isOpen) return
        const onPointerDown = (e: PointerEvent) => {
            if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false)
        }
        document.addEventListener('pointerdown', onPointerDown)
        return () => document.removeEventListener('pointerdown', onPointerDown)
    }, [isOpen])

    const pick = (hit: SteamMatchHit) => {
        onChange(hit.name)
        setLinkedName(hit.name)
        onLink(hit)
        setIsOpen(false)
        setActiveIndex(-1)
    }

    const unlink = () => {
        setLinkedName(null)
        onLink(null)
    }

    const handleChange = (next: string) => {
        onChange(next)
        setIsOpen(true)
        // Editing the title away from the linked game breaks the link rather
        // than silently keeping a match the user can no longer see.
        if (linkedAppId && next !== linkedName) unlink()
    }

    const handleKeyDown = (e: React.KeyboardEvent) => {
        if (e.key === 'Escape') { setIsOpen(false); return }
        if (!isOpen || results.length === 0) return

        if (e.key === 'ArrowDown') {
            e.preventDefault()
            setActiveIndex((i) => (i + 1) % results.length)
        } else if (e.key === 'ArrowUp') {
            e.preventDefault()
            setActiveIndex((i) => (i <= 0 ? results.length - 1 : i - 1))
        } else if (e.key === 'Enter' && activeIndex >= 0) {
            // Only swallow Enter when a suggestion is actually highlighted —
            // otherwise it must still submit the form.
            e.preventDefault()
            const hit = results[activeIndex]
            if (hit) pick(hit)
        }
    }

    return (
        <div ref={containerRef} className="relative">
            <label className={FIELD_LABEL}>{label} *</label>
            <input
                type="text"
                value={value}
                onChange={(e) => handleChange(e.target.value)}
                onFocus={() => setIsOpen(true)}
                onKeyDown={handleKeyDown}
                placeholder={placeholder}
                required
                autoComplete="off"
                role="combobox"
                aria-expanded={isOpen}
                aria-controls="steam-title-suggestions"
                aria-autocomplete="list"
                className={FIELD_INPUT}
            />

            {linkedAppId ? (
                <p className={`${FIELD_HINT} flex items-center gap-1.5 text-crimson-400`}>
                    <Link2 className="w-3 h-3 shrink-0" />
                    Linked to Steam — art and achievements will come from there
                    <button
                        type="button"
                        onClick={unlink}
                        aria-label="Remove Steam link"
                        className="ml-0.5 text-text-muted hover:text-text-primary transition-colors duration-100"
                    >
                        <X className="w-3 h-3" />
                    </button>
                </p>
            ) : (
                <p className={FIELD_HINT}>Start typing to find it on Steam, or write your own name.</p>
            )}

            {isOpen && value.trim().length >= 2 && !linkedAppId && (
                <div className="absolute left-0 right-0 top-full mt-1 z-20 bg-void-elevated border border-void-border rounded-lg shadow-void-float overflow-hidden">
                    <SteamSuggestionList
                        listId="steam-title-suggestions"
                        results={results}
                        isLoading={isLoading}
                        activeIndex={activeIndex}
                        linkedAppId={linkedAppId}
                        onPick={pick}
                        onHover={setActiveIndex}
                    />
                </div>
            )}
        </div>
    )
}
