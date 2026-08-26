import { FIELD_HINT, FIELD_INPUT, FIELD_INPUT_MONO, FIELD_LABEL } from './field-styles'

interface TextFieldProps {
    label: string
    value: string
    onChange: (value: string) => void
    placeholder?: string
    hint?: string
    mono?: boolean
    required?: boolean
    multiline?: boolean
    rows?: number
}

export function TextField({
    label, value, onChange, placeholder, hint, mono, required, multiline, rows = 3,
}: TextFieldProps) {
    const className = mono ? FIELD_INPUT_MONO : FIELD_INPUT

    return (
        <div>
            <label className={FIELD_LABEL}>
                {label}{required && ' *'}
            </label>
            {multiline ? (
                <textarea
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    rows={rows}
                    required={required}
                    className={`${className} resize-y`}
                />
            ) : (
                <input
                    type="text"
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    placeholder={placeholder}
                    required={required}
                    className={className}
                />
            )}
            {hint && <p className={FIELD_HINT}>{hint}</p>}
        </div>
    )
}
