import { useEffect, useRef, useState } from 'react'

const EASE_OUT_EXPO = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t))

function prefersReducedMotion(): boolean {
    return typeof window !== 'undefined'
        && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true
}

/**
 * Counts from 0 to `target` once, for numbers worth watching land. Returns the
 * target immediately when the user asked for reduced motion, and whenever the
 * target changes mid-flight it restarts from the current value rather than
 * snapping back to zero.
 */
export function useCountUp(target: number, durationMs = 650, delayMs = 0): number {
    const [value, setValue] = useState(() => (prefersReducedMotion() ? target : 0))
    const frameRef = useRef<number>(0)
    const fromRef = useRef(0)

    useEffect(() => {
        if (prefersReducedMotion() || durationMs <= 0) {
            setValue(target)
            return
        }

        const from = fromRef.current
        if (from === target) return

        let start: number | null = null
        const tick = (now: number) => {
            if (start === null) start = now
            const elapsed = now - start - delayMs
            if (elapsed < 0) {
                frameRef.current = requestAnimationFrame(tick)
                return
            }
            const t = Math.min(1, elapsed / durationMs)
            const next = from + (target - from) * EASE_OUT_EXPO(t)
            fromRef.current = next
            setValue(next)
            if (t < 1) frameRef.current = requestAnimationFrame(tick)
            else fromRef.current = target
        }

        frameRef.current = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(frameRef.current)
    }, [target, durationMs, delayMs])

    return value
}
