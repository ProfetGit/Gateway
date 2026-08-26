import { motion } from 'framer-motion'
import { FIELD_HINT } from './field-styles'

interface ToggleFieldProps {
    label: string
    checked: boolean
    onChange: (checked: boolean) => void
    hint?: string
    /** Set when the underlying tool is missing; explains why, and blocks the toggle. */
    disabledReason?: string
}

export function ToggleField({ label, checked, onChange, hint, disabledReason }: ToggleFieldProps) {
    const disabled = Boolean(disabledReason)
    const on = checked && !disabled

    return (
        <div>
            <button
                type="button"
                role="switch"
                aria-checked={on}
                disabled={disabled}
                onClick={() => onChange(!checked)}
                className="w-full flex items-center justify-between gap-4 text-left disabled:cursor-not-allowed disabled:opacity-50"
            >
                <span className="text-sm text-text-primary">{label}</span>
                <span
                    className={`relative w-11 h-6 rounded-full border shrink-0 transition-colors duration-100 ${
                        on
                            ? 'bg-crimson-900/40 border-crimson-500/60'
                            : 'bg-void-surface border-void-border'
                    }`}
                >
                    <motion.span
                        className={`absolute top-0.5 left-0.5 w-4.5 h-4.5 rounded-full ${on ? 'bg-crimson-500' : 'bg-text-ghost'}`}
                        animate={{ x: on ? 20 : 0 }}
                        transition={{ duration: 0.1, ease: [0.16, 1, 0.3, 1] }}
                    />
                </span>
            </button>
            {(disabledReason || hint) && <p className={FIELD_HINT}>{disabledReason ?? hint}</p>}
        </div>
    )
}
