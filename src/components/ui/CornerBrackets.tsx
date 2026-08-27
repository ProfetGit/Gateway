interface CornerBracketsProps {
    /** Tailwind border-color class, e.g. "border-crimson-500". */
    colorClass: string
    /** Leg length — any CSS length. Cards pass `cqw` so it tracks card width. */
    size?: number | string
    /** Stroke weight, likewise. */
    thickness?: number | string
    /** Extra classes for the wrapper — z-index, mostly. */
    className?: string
}

// Each bracket is two legs, not one L-shaped box. A box scaled from its corner
// thins its own stroke on the way in, which reads as a fade rather than a draw.
// Scaling one axis of a zero-height/zero-width border leaves the stroke at full
// weight the whole time, so the leg genuinely extends out of the corner.
// GPU-only: transform, no layout.
const leg = 'absolute transition-transform duration-150 ease-out-expo group-hover:duration-200'

export function CornerBrackets({
    colorClass,
    size = 'max(14px, 13cqw)',
    thickness = 'clamp(2px, 1.8cqw, 5px)',
    className = '',
}: CornerBracketsProps) {
    return (
        <div className={`absolute inset-0 pointer-events-none ${className}`}>
            <div
                style={{ width: size, borderTopWidth: thickness }}
                className={`${leg} top-0 left-0 h-0 ${colorClass} origin-left scale-x-0 group-hover:scale-x-100`}
            />
            <div
                style={{ height: size, borderLeftWidth: thickness }}
                className={`${leg} top-0 left-0 w-0 ${colorClass} origin-top scale-y-0 group-hover:scale-y-100 group-hover:delay-[40ms]`}
            />
            <div
                style={{ width: size, borderBottomWidth: thickness }}
                className={`${leg} bottom-0 right-0 h-0 ${colorClass} origin-right scale-x-0 group-hover:scale-x-100 group-hover:delay-[60ms]`}
            />
            <div
                style={{ height: size, borderRightWidth: thickness }}
                className={`${leg} bottom-0 right-0 w-0 ${colorClass} origin-bottom scale-y-0 group-hover:scale-y-100 group-hover:delay-[100ms]`}
            />
        </div>
    )
}
