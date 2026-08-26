import { motion } from 'framer-motion'
import { FolderOpen } from 'lucide-react'
import { FIELD_ADORNMENT, FIELD_HINT, FIELD_INPUT_MONO, FIELD_LABEL } from './field-styles'

interface PathFieldProps {
    label: string
    value: string
    onChange: (value: string) => void
    onBrowse: () => void
    placeholder?: string
    hint?: string
    icon?: React.ReactNode
    browseLabel?: string
}

export function PathField({
    label, value, onChange, onBrowse, placeholder, hint, icon, browseLabel = 'Browse',
}: PathFieldProps) {
    return (
        <div>
            <label className={FIELD_LABEL}>{label}</label>
            <div className="flex gap-2">
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    className={`${FIELD_INPUT_MONO} flex-1`}
                />
                <motion.button
                    type="button"
                    onClick={onBrowse}
                    aria-label={browseLabel}
                    title={browseLabel}
                    className={FIELD_ADORNMENT}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    {icon ?? <FolderOpen className="w-4 h-4" />}
                </motion.button>
            </div>
            {hint && <p className={FIELD_HINT}>{hint}</p>}
        </div>
    )
}
