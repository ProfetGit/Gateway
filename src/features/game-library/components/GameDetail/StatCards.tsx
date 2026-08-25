import React from 'react'

export function InfoRow({ label, value, icon }: { label: string; value: string; icon?: React.ReactNode }) {
    return (
        <div className="flex items-center justify-between py-2 border-b border-void-border/20">
            <span className="text-[10px] font-mono uppercase tracking-widest text-white/30 flex items-center gap-1.5">
                {icon}
                {label}
            </span>
            <span className="text-xs font-mono text-white/60">{value}</span>
        </div>
    )
}

export function RequirementsCard({ title, icon, color, html }: {
    title: string
    icon: React.ReactNode
    color: 'crimson' | 'emerald'
    html: string
}) {
    return (
        <div className="p-4 bg-void-surface/40 border border-void-border/25">
            <div className={`flex items-center gap-2 mb-3 ${color === 'crimson' ? 'text-crimson-500/70' : 'text-emerald-500/70'}`}>
                {icon}
                <span className="text-[10px] font-mono uppercase tracking-widest">{title}</span>
            </div>
            <div
                className="select-text text-[11px] text-white/50 leading-relaxed space-y-1 font-mono [&_strong]:text-white/70 [&_strong]:block [&_strong]:mt-2 [&_strong]:mb-0.5"
                dangerouslySetInnerHTML={{ __html: html }}
            />
        </div>
    )
}

export function EmptyState({ icon, message }: { icon: React.ReactNode; message: string }) {
    return (
        <div className="flex flex-col items-center justify-center py-20 text-white/20">
            <div className="mb-4 opacity-30">{icon}</div>
            <span className="text-sm font-mono uppercase tracking-widest">{message}</span>
        </div>
    )
}
