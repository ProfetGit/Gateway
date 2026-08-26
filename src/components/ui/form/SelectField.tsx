import { ChevronDown } from 'lucide-react'
import { FIELD_HINT, FIELD_INPUT, FIELD_LABEL } from './field-styles'

export interface SelectOption {
    value: string
    label: string
}

interface SelectFieldProps {
    label: string
    value: string
    options: SelectOption[]
    onChange: (value: string) => void
    hint?: string
}

export function SelectField({ label, value, options, onChange, hint }: SelectFieldProps) {
    return (
        <div>
            <label className={FIELD_LABEL}>{label}</label>
            <div className="relative">
                <select
                    value={value}
                    onChange={(e) => onChange(e.target.value)}
                    className={`${FIELD_INPUT} appearance-none pr-10 cursor-pointer`}
                >
                    {options.map((option) => (
                        <option key={option.value} value={option.value} className="bg-void-elevated">
                            {option.label}
                        </option>
                    ))}
                </select>
                <ChevronDown className="w-4 h-4 text-text-muted absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
            {hint && <p className={FIELD_HINT}>{hint}</p>}
        </div>
    )
}
