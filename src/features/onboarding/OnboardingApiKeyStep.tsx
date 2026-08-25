import React from 'react'
import { Check, ExternalLink, KeyRound, Loader2 } from 'lucide-react'
import { setSteamApiKey } from './api/set-steam-api-key'
import { openUrl } from '@/lib/api/navigation'

export type OnboardingApiKeyStepProps = {
    steamUser: { username: string; avatarUrl: string } | null
    onDone: () => void
    onSkip: () => void
}

export function OnboardingApiKeyStep({ steamUser, onDone, onSkip }: OnboardingApiKeyStepProps) {
    const [value, setValue] = React.useState('')
    const [saving, setSaving] = React.useState(false)
    const [error, setError] = React.useState<string | null>(null)

    const handleSave = async () => {
        const trimmed = value.trim()
        if (!trimmed) { setError('Paste a key first'); return }
        if (!/^[A-F0-9]{32}$/i.test(trimmed)) { setError('Keys are 32 hex characters'); return }
        setSaving(true)
        setError(null)
        try {
            const result = await setSteamApiKey(trimmed)
            if (result?.success) {
                onDone()
            } else {
                setError(result?.error ?? 'Failed to save key')
            }
        } catch {
            setError('Failed to save key')
        } finally {
            setSaving(false)
        }
    }

    return (
        <div className="space-y-8">
            <div>
                <p className="text-[10px] font-mono text-crimson-500 uppercase tracking-[0.3em] mb-3">Step 2 of 3</p>
                <h1 className="text-4xl font-display font-black italic tracking-tighter uppercase text-white leading-none mb-4">
                    Steam<br />API key
                </h1>

                {steamUser && (
                    <div className="flex items-center gap-2.5 mb-4 px-3 py-2 border border-emerald-500/25 bg-emerald-500/5">
                        {steamUser.avatarUrl && (
                            <img src={steamUser.avatarUrl} alt="" className="w-7 h-7 rounded-sm shrink-0" />
                        )}
                        <div className="min-w-0">
                            <p className="text-[10px] font-mono text-emerald-400 uppercase tracking-widest">Signed in as</p>
                            <p className="text-xs font-mono text-white truncate">{steamUser.username}</p>
                        </div>
                        <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0 ml-auto" />
                    </div>
                )}

                <p className="text-sm text-white/55 leading-relaxed">
                    Needed to load your games and achievements. Get one from Steam — it takes under a minute.
                </p>
            </div>

            <div className="space-y-3">
                <div className="flex items-stretch gap-2">
                    <input
                        type="password"
                        value={value}
                        onChange={(e) => { setValue(e.target.value); setError(null) }}
                        onKeyDown={(e) => { if (e.key === 'Enter') handleSave() }}
                        placeholder="Paste your key here"
                        className="flex-1 px-3 py-2.5 bg-void-surface border border-white/15 focus:border-crimson-500/60 focus:outline-none text-xs font-mono text-white placeholder:text-white/25 tracking-wider"
                    />
                    <button
                        onClick={handleSave}
                        disabled={saving}
                        className="px-4 py-2.5 text-xs font-mono font-bold uppercase tracking-widest border border-crimson-500/50 text-crimson-300 hover:bg-crimson-500/10 hover:border-crimson-500 disabled:opacity-40 disabled:cursor-not-allowed transition-colors duration-100 flex items-center gap-1.5 shrink-0"
                    >
                        {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <KeyRound className="w-3 h-3" />}
                        Save
                    </button>
                </div>

                {error && (
                    <p className="text-[11px] font-mono text-red-400 uppercase tracking-widest">{error}</p>
                )}

                <div className="flex items-center justify-between pt-1">
                    <button
                        onClick={() => openUrl('https://steamcommunity.com/dev/apikey')}
                        className="text-[10px] font-mono text-white/35 hover:text-crimson-300 transition-colors duration-100 uppercase tracking-widest flex items-center gap-1.5"
                    >
                        Get a key from Steam
                        <ExternalLink className="w-2.5 h-2.5" />
                    </button>
                    <button
                        onClick={onSkip}
                        className="text-[10px] font-mono text-white/30 hover:text-white/60 uppercase tracking-widest transition-colors duration-100"
                    >
                        Skip for now
                    </button>
                </div>
            </div>
        </div>
    )
}
