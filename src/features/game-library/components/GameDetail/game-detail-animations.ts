import type { Transition, Variants } from 'framer-motion'

export const EASE_EXPO = [0.16, 1, 0.3, 1] as const

/** Hover, everywhere. Matches the cards. */
export const hoverTransition: Transition = { duration: 0.1, ease: EASE_EXPO }

export const backdropVariants: Variants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.18, ease: EASE_EXPO } },
    exit: { opacity: 0, transition: { duration: 0.14, ease: EASE_EXPO } },
}

/**
 * The shell barely moves — 1.5% and 12px. The overlay is nearly full-screen, so
 * a big scale reads as a zoom rather than an arrival, and the choreography below
 * is what carries the entrance.
 */
export const shellVariants: Variants = {
    hidden: { opacity: 0, scale: 0.985, y: 14 },
    visible: { opacity: 1, scale: 1, y: 0, transition: { duration: 0.3, ease: EASE_EXPO } },
    exit: { opacity: 0, scale: 0.99, y: 8, transition: { duration: 0.16, ease: EASE_EXPO } },
}

/** Cover art settles out of a slight overscale, like a plate being set down. */
export const coverVariants: Variants = {
    hidden: { opacity: 0, scale: 1.06 },
    visible: { opacity: 1, scale: 1, transition: { delay: 0.06, duration: 0.5, ease: EASE_EXPO } },
}

/** Rail items rise in sequence under the cover. */
export function railItem(index: number): Variants {
    return {
        hidden: { opacity: 0, y: 10 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { delay: 0.14 + index * 0.05, duration: 0.34, ease: EASE_EXPO },
        },
    }
}

/** The Launch strip arrives the way it does on a library card: from below. */
export const launchVariants: Variants = {
    hidden: { opacity: 0, y: 14 },
    visible: { opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.34, ease: EASE_EXPO } },
}

/** Panel bands, staggered left-to-right down the page. */
export function bandVariants(index: number): Variants {
    return {
        hidden: { opacity: 0, y: 12 },
        visible: {
            opacity: 1,
            y: 0,
            transition: { delay: 0.18 + index * 0.07, duration: 0.36, ease: EASE_EXPO },
        },
    }
}

/** Rows inside a band, offset from that band's own delay. */
export function rowVariants(bandIndex: number, rowIndex: number): Variants {
    return {
        hidden: { opacity: 0, x: -8 },
        visible: {
            opacity: 1,
            x: 0,
            transition: {
                delay: 0.24 + bandIndex * 0.07 + rowIndex * 0.045,
                duration: 0.3,
                ease: EASE_EXPO,
            },
        },
    }
}

/** Progress fill. Deliberately the slowest thing on screen — it is the payoff. */
export const trackTransition: Transition = { delay: 0.34, duration: 0.95, ease: EASE_EXPO }

/** Count-up timings for the two numbers that matter. */
export const COUNT_MS = 700
export const COUNT_DELAY_MS = 260
