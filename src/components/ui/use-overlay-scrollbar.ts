import { useCallback, useEffect, useRef, useState } from 'react'

const MIN_THUMB_PX = 36
const IDLE_HIDE_MS = 1100

export interface OverlayThumb {
    height: number
    top: number
    /** False when the content fits — nothing to show. */
    scrollable: boolean
    visible: boolean
    dragging: boolean
}

/**
 * Drives a scrollbar drawn as a real element on top of the content.
 *
 * Chromium removed `overflow: overlay`, and a native scrollbar always reserves
 * layout width — which is what leaves a strip of background beside a full-bleed
 * hero. The only way to let content run underneath the bar is to hide the native
 * one and draw our own, which also buys real transitions and idle-fade that
 * scrollbar pseudo-elements cannot have.
 */
export function useOverlayScrollbar<T extends HTMLElement>() {
    const scrollRef = useRef<T>(null)
    const [thumb, setThumb] = useState<OverlayThumb>({
        height: 0, top: 0, scrollable: false, visible: false, dragging: false,
    })
    const hideTimer = useRef<number>(0)
    const drag = useRef<{ startY: number; startScroll: number } | null>(null)

    const measure = useCallback((keepVisible = false) => {
        const el = scrollRef.current
        if (!el) return

        const { scrollHeight, clientHeight, scrollTop } = el
        const scrollable = scrollHeight - clientHeight > 1
        if (!scrollable) {
            setThumb((t) => ({ ...t, scrollable: false, visible: false }))
            return
        }

        const height = Math.max(MIN_THUMB_PX, (clientHeight / scrollHeight) * clientHeight)
        const top = (scrollTop / (scrollHeight - clientHeight)) * (clientHeight - height)
        setThumb((t) => ({
            ...t,
            height,
            top: Number.isFinite(top) ? top : 0,
            scrollable: true,
            visible: keepVisible || t.dragging || t.visible,
        }))
    }, [])

    const flash = useCallback(() => {
        setThumb((t) => (t.scrollable ? { ...t, visible: true } : t))
        window.clearTimeout(hideTimer.current)
        hideTimer.current = window.setTimeout(() => {
            setThumb((t) => (t.dragging ? t : { ...t, visible: false }))
        }, IDLE_HIDE_MS)
    }, [])

    useEffect(() => {
        const el = scrollRef.current
        if (!el) return

        const onScroll = () => { measure(true); flash() }
        el.addEventListener('scroll', onScroll, { passive: true })

        const observer = new ResizeObserver(() => measure())
        observer.observe(el)
        if (el.firstElementChild) observer.observe(el.firstElementChild)

        measure()
        return () => {
            el.removeEventListener('scroll', onScroll)
            observer.disconnect()
            window.clearTimeout(hideTimer.current)
        }
    }, [measure, flash])

    const onThumbPointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const el = scrollRef.current
        if (!el) return
        e.preventDefault()
        e.currentTarget.setPointerCapture(e.pointerId)
        drag.current = { startY: e.clientY, startScroll: el.scrollTop }
        setThumb((t) => ({ ...t, dragging: true, visible: true }))
    }, [])

    const onThumbPointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        const el = scrollRef.current
        const state = drag.current
        if (!el || !state) return

        const { scrollHeight, clientHeight } = el
        const thumbHeight = Math.max(MIN_THUMB_PX, (clientHeight / scrollHeight) * clientHeight)
        const travel = clientHeight - thumbHeight
        if (travel <= 0) return

        const ratio = (scrollHeight - clientHeight) / travel
        el.scrollTop = state.startScroll + (e.clientY - state.startY) * ratio
    }, [])

    const onThumbPointerUp = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
        drag.current = null
        e.currentTarget.releasePointerCapture?.(e.pointerId)
        setThumb((t) => ({ ...t, dragging: false }))
        flash()
    }, [flash])

    return {
        scrollRef,
        thumb,
        flash,
        thumbHandlers: {
            onPointerDown: onThumbPointerDown,
            onPointerMove: onThumbPointerMove,
            onPointerUp: onThumbPointerUp,
            onPointerCancel: onThumbPointerUp,
        },
    }
}
