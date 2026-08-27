/**
 * The library card's launch strip, reused as a dialog's commit action: a quiet
 * outlined bar whose crimson fill wipes in from the left, with a white copy of
 * the label clipped by the same edge so each letter changes as the fill passes.
 *
 * Both clips are gated on `:enabled` — without that, a disabled button still
 * lights its label on hover and reads as usable.
 */
export type ActionStripProps = {
    label: string
    disabled?: boolean
    type?: 'button' | 'submit'
    onClick?: () => void
    className?: string
}

const LABEL =
    'absolute inset-0 flex items-center justify-center font-mono font-bold uppercase tracking-[0.2em] text-xs'
const WIPE =
    'transition-[clip-path] duration-100 ease-out-expo group-hover/strip:duration-[240ms]'
const CLIPPED =
    '[clip-path:inset(0_100%_0_0)] group-enabled/strip:group-hover/strip:[clip-path:inset(0)]'

export function ActionStrip({ label, disabled = false, type = 'button', onClick, className = '' }: ActionStripProps) {
    return (
        <button
            type={type}
            onClick={onClick}
            disabled={disabled}
            className={`group/strip relative h-[50px] w-full overflow-hidden bg-void-pure/90 border border-crimson-500/50 enabled:hover:border-crimson-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100 ease-out-expo focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-crimson-400 ${className}`}
        >
            <span className={`absolute inset-0 bg-crimson-600 ${CLIPPED} ${WIPE}`} />
            <span className={`${LABEL} text-crimson-300`} style={{ WebkitFontSmoothing: 'antialiased' }}>
                {label}
            </span>
            <span aria-hidden className={`${CLIPPED} ${WIPE}`}>
                <span className={`${LABEL} text-white`} style={{ WebkitFontSmoothing: 'antialiased' }}>
                    {label}
                </span>
            </span>
        </button>
    )
}
