export const backdropVariants = {
    hidden: { opacity: 0 },
    visible: { opacity: 1 }
}

export const containerVariants = {
    hidden: { opacity: 0, scale: 0.95, y: 30 },
    visible: { opacity: 1, scale: 1, y: 0 },
    exit: { opacity: 0, scale: 0.95, y: 30 }
}

export const launchBoltVariants = {
    idle:  { x: 0, scale: 1, backgroundColor: 'oklch(0.52 0.23 25)' },
    hover: { x: 6, scale: 1.05, backgroundColor: 'oklch(0.98 0.003 25)', boxShadow: '0 0 40px oklch(0.98 0.003 25 / 0.5)' },
    tap:   { scale: 0.92 }
}

export const launchIconVariants = {
    idle:  { color: 'oklch(0.98 0.003 25)' },
    hover: { color: 'oklch(0.52 0.23 25)' }
}

export const launchTextVariants = {
    idle:  { x: 0, skewX: 0, opacity: 0.9 },
    hover: { x: 8, skewX: -8, opacity: 1, textShadow: '3px 3px 0px oklch(0.52 0.23 25 / 0.4)' }
}

export const launchSubtextVariants = {
    idle:  { x: 0, opacity: 0.6 },
    hover: { x: 8, opacity: 1 }
}

export const installBoltVariants = {
    idle:  { x: 0, scale: 1, borderColor: 'oklch(0.98 0.003 25 / 0.3)', backgroundColor: 'oklch(0.98 0.003 25 / 0.05)' },
    hover: { x: 6, scale: 1.05, borderColor: 'oklch(0.52 0.23 25)', backgroundColor: 'oklch(0.52 0.23 25)', boxShadow: '0 0 30px oklch(0.52 0.23 25 / 0.5)' },
    tap:   { scale: 0.92 }
}

export const installIconVariants = {
    idle:  { color: 'oklch(0.98 0.003 25 / 0.7)' },
    hover: { color: 'oklch(0.98 0.003 25)' }
}

export const installTextVariants = {
    idle:  { x: 0, skewX: 0, opacity: 0.7 },
    hover: { x: 8, skewX: -8, opacity: 1, textShadow: '3px 3px 0px oklch(0.52 0.23 25 / 0.4)' }
}

export const installSubtextVariants = {
    idle:  { x: 0, opacity: 0.5 },
    hover: { x: 8, opacity: 1, color: 'oklch(0.52 0.23 25 / 0.8)' }
}

// Hover transition — 100ms ease-out-expo, GPU-only. Replaces former spring physics on hover (banned).
export const hoverTransition = { duration: 0.1, ease: [0.16, 1, 0.3, 1] as const }
// Entrance / one-shot reveal transition — spring is acceptable here per signature-design Phase 2.
export const springTransition = { type: "spring" as const, stiffness: 500, damping: 30 }
export const fastTransition = { duration: 0.15, ease: "easeOut" as const }
