import { useCallback, useEffect, useRef, useState } from 'react'

export interface HorizontalScroller {
    scrollRef: React.RefObject<HTMLDivElement>
    canScrollLeft: boolean
    canScrollRight: boolean
    scrollByPage: (direction: 'left' | 'right') => void
}

const PAGE_FRACTION = 0.85

export function useHorizontalScroller(): HorizontalScroller {
    const scrollRef = useRef<HTMLDivElement>(null)
    const [canScrollLeft, setCanScrollLeft] = useState(false)
    const [canScrollRight, setCanScrollRight] = useState(true)

    const checkScroll = useCallback(() => {
        const el = scrollRef.current
        if (!el) return
        const { scrollLeft, scrollWidth, clientWidth } = el
        const firstCard = el.children[0] as HTMLElement | undefined
        const startOffset = firstCard?.offsetLeft || 0

        setCanScrollLeft(scrollLeft > startOffset + 5)
        setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 10)
    }, [])

    const scrollByPage = useCallback((direction: 'left' | 'right') => {
        const el = scrollRef.current
        if (!el) return
        const delta = Math.round(el.clientWidth * PAGE_FRACTION) * (direction === 'left' ? -1 : 1)
        el.scrollBy({ left: delta, behavior: 'smooth' })
    }, [])

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return
        el.addEventListener('scroll', checkScroll, { passive: true })
        const timer = setTimeout(checkScroll, 100)
        window.addEventListener('resize', checkScroll)
        return () => {
            el.removeEventListener('scroll', checkScroll)
            window.removeEventListener('resize', checkScroll)
            clearTimeout(timer)
        }
    }, [checkScroll])

    return { scrollRef, canScrollLeft, canScrollRight, scrollByPage }
}
