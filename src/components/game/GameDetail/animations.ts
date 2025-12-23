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
    idle: { x: 0, scale: 1, backgroundColor: '#dc2626' },
    hover: { x: 6, scale: 1.05, backgroundColor: '#ffffff', boxShadow: '0 0 40px rgba(255,255,255,0.5)' },
    tap: { scale: 0.92 }
}

export const launchIconVariants = {
    idle: { color: '#ffffff' },
    hover: { color: '#dc2626' }
}

export const launchTextVariants = {
    idle: { x: 0, skewX: 0, opacity: 0.9 },
    hover: { x: 8, skewX: -8, opacity: 1, textShadow: '3px 3px 0px rgba(220,38,38,0.4)' }
}

export const launchSubtextVariants = {
    idle: { x: 0, opacity: 0.6 },
    hover: { x: 8, opacity: 1 }
}

export const installBoltVariants = {
    idle: { x: 0, scale: 1, borderColor: 'rgba(255,255,255,0.3)', backgroundColor: 'rgba(255,255,255,0.05)' },
    hover: { x: 6, scale: 1.05, borderColor: '#dc2626', backgroundColor: '#dc2626', boxShadow: '0 0 30px rgba(220,38,38,0.5)' },
    tap: { scale: 0.92 }
}

export const installIconVariants = {
    idle: { color: 'rgba(255,255,255,0.7)' },
    hover: { color: '#ffffff' }
}

export const installTextVariants = {
    idle: { x: 0, skewX: 0, opacity: 0.7 },
    hover: { x: 8, skewX: -8, opacity: 1, textShadow: '3px 3px 0px rgba(220,38,38,0.4)' }
}

export const installSubtextVariants = {
    idle: { x: 0, opacity: 0.5 },
    hover: { x: 8, opacity: 1, color: 'rgba(220,38,38,0.8)' }
}

export const springTransition = { type: "spring" as const, stiffness: 500, damping: 30 }
export const fastTransition = { duration: 0.15, ease: "easeOut" as const }
