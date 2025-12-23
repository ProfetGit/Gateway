import React from 'react'

export function LaunchToggle({
    label,
    description,
    icon,
    enabled,
    onToggle
}: {
    label: string
    description: string
    icon: React.ReactNode
    enabled: boolean
    onToggle: () => void
}) {
    return (
        <button
            onClick={onToggle}
            className="w-full flex items-center justify-between py-2 group hover:bg-white/[0.02] rounded-lg transition-colors -mx-1 px-1"
        >
            <div className="flex items-center gap-2.5">
                <div className={`p-1.5 rounded-md transition-colors ${enabled ? 'bg-emerald-500/20 text-emerald-400' : 'bg-white/5 text-white/40 group-hover:text-white/60'}`}>
                    {icon}
                </div>
                <div className="flex flex-col items-start">
                    <span className={`text-[11px] font-mono uppercase tracking-wider transition-colors ${enabled ? 'text-white/90' : 'text-white/70 group-hover:text-white/90'}`}>
                        {label}
                    </span>
                    <span className="text-[9px] font-mono text-white/40">{description}</span>
                </div>
            </div>
            <div className={`relative w-9 h-5 rounded-full transition-all duration-300 ${enabled
                ? 'bg-emerald-500/30 border-emerald-500/60'
                : 'bg-void-surface/80 border-void-border/50'
                } border`}>
                <div
                    className={`absolute top-0.5 w-4 h-4 rounded-full transition-all duration-200 shadow-sm ${enabled ? 'bg-emerald-500 translate-x-4' : 'bg-white/30 translate-x-0.5'
                        }`}
                />
            </div>
        </button>
    )
}

export function GamescopeInput({
    label,
    value,
    placeholder,
    onChange
}: {
    label: string
    value: number | undefined
    placeholder: string
    onChange: (value: number | undefined) => void
}) {
    return (
        <div className="space-y-1">
            <label className="text-[9px] font-mono uppercase tracking-wider text-white/50">{label}</label>
            <input
                type="number"
                value={value ?? ''}
                placeholder={placeholder}
                onChange={(e) => onChange(e.target.value ? parseInt(e.target.value) : undefined)}
                className="w-full px-2 py-1.5 text-[11px] font-mono bg-void-surface/80 border border-void-border/40 rounded text-white/90 placeholder:text-white/30 focus:outline-none focus:border-crimson-500/50 focus:bg-void-surface transition-colors"
            />
        </div>
    )
}

export function GamescopeMiniToggle({
    label,
    enabled,
    onToggle
}: {
    label: string
    enabled: boolean
    onToggle: () => void
}) {
    return (
        <button
            onClick={onToggle}
            className={`px-2.5 py-1.5 text-[9px] font-mono uppercase rounded transition-all flex items-center gap-1.5 ${enabled
                ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/50'
                : 'bg-void-surface/50 text-white/50 border border-void-border/30 hover:text-white/70 hover:border-void-border/50'
                }`}
        >
            <div className={`w-2 h-2 rounded-full ${enabled ? 'bg-emerald-500' : 'bg-white/30'}`} />
            {label}
        </button>
    )
}
