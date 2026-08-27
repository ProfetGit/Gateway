import { useEffect, useRef, useState } from 'react'

export type PanelDensity = 'roomy' | 'compact'

/** Below this the four bands cannot all fit at full padding with five rows. */
const COMPACT_BELOW_PX = 780

/**
 * The panel is a fixed-height surface with no scrolling by design, so it has to
 * give something up on short windows. Measuring beats guessing from viewport
 * height: the overlay is inset and the rail is a sibling, so the panel's own box
 * is the only honest number.
 */
export function usePanelDensity<T extends HTMLElement>() {
    const ref = useRef<T>(null)
    const [density, setDensity] = useState<PanelDensity>('roomy')

    useEffect(() => {
        const el = ref.current
        if (!el) return

        const measure = () => setDensity(el.clientHeight < COMPACT_BELOW_PX ? 'compact' : 'roomy')
        measure()

        const observer = new ResizeObserver(measure)
        observer.observe(el)
        return () => observer.disconnect()
    }, [])

    return { ref, density, isCompact: density === 'compact' }
}
