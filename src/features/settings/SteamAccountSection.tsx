import { motion, AnimatePresence } from 'framer-motion'
import { LogIn, LogOut, KeyRound, ExternalLink, Check, ChevronDown, User as UserIcon } from 'lucide-react'
import type { AuthState } from '@/features/auth/api/auth-schema'
import { openUrl } from '@/lib/api/navigation'

export type SteamAccountSectionProps = {
    authState: AuthState
    isLoggingIn: boolean
    onLogin: () => void
    onLogout: () => void
    hasStoredKey: boolean
    keyExpanded: boolean
    setKeyExpanded: (b: boolean) => void
    apiKey: string
    setApiKey: (s: string) => void
    setApiKeyError: (s: string | null) => void
    setApiKeySaved: (b: boolean) => void
    apiKeyError: string | null
    apiKeySaved: boolean
    onSaveKey: () => void
    onClearKey: () => void
}

export function SteamAccountSection(props: SteamAccountSectionProps) {
    const { authState, isLoggingIn, onLogin, onLogout, hasStoredKey, keyExpanded, setKeyExpanded, apiKey, setApiKey, setApiKeyError, setApiKeySaved, apiKeyError, apiKeySaved, onSaveKey, onClearKey } = props

    return (
        <div className="space-y-4">
            {/* Identity card — compact horizontal */}
            <div className="bg-white/5 border border-white/10 p-4">
                {authState.isLoggedIn && authState.user ? (
                    <div className="flex items-center gap-4">
                        <div className="relative shrink-0">
                            <div className="w-14 h-14 rounded-sm overflow-hidden border border-crimson-500/30">
                                <img src={authState.user.avatarUrl} alt={authState.user.username} className="w-full h-full object-cover" />
                            </div>
                        </div>
                        <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-display font-black text-white uppercase tracking-tight italic truncate">
                                {authState.user.username}
                            </h3>
                            <p className="font-mono text-[10px] text-white/50 tracking-widest uppercase mt-0.5">
                                Signed in to Steam
                            </p>
                        </div>
                        <button
                            onClick={onLogout}
                            className="shrink-0 px-3 py-2 border border-white/15 hover:border-crimson-500/50 hover:text-crimson-300 text-white/70 font-mono text-[10px] uppercase tracking-widest font-bold transition-colors duration-100 flex items-center gap-1.5"
                        >
                            <LogOut className="w-3 h-3" />
                            Disconnect
                        </button>
                    </div>
                ) : (
                    <div className="flex flex-col items-center text-center py-4">
                        <div className="w-12 h-12 bg-white/5 rounded-full flex items-center justify-center mb-3 border border-white/10">
                            <UserIcon className="w-6 h-6 text-white/40" />
                        </div>
                        <h3 className="text-base font-bold text-white uppercase tracking-tight mb-1">Not signed in</h3>
                        <p className="font-mono text-[10px] text-white/40 mb-4 max-w-xs uppercase tracking-wider">
                            Sign in to Steam to load your games
                        </p>
                        <button
                            onClick={onLogin}
                            disabled={isLoggingIn}
                            className="px-5 py-2.5 bg-crimson-600 border border-crimson-500 hover:bg-crimson-500 text-white font-display font-black italic tracking-wider uppercase text-sm transition-colors duration-100 flex items-center gap-2 disabled:opacity-50"
                        >
                            <LogIn className="w-4 h-4" />
                            {isLoggingIn ? "Connecting..." : "Connect Steam"}
                        </button>
                    </div>
                )}
            </div>

            {/* Steam Key — accordion */}
            <div className="bg-white/[0.02] border border-white/10">
                <button
                    onClick={() => setKeyExpanded(!keyExpanded)}
                    className="w-full flex items-center justify-between px-4 py-3 hover:bg-white/[0.03] transition-colors duration-100 group"
                >
                    <div className="flex items-center gap-3">
                        <KeyRound className="w-4 h-4 text-white/50 group-hover:text-crimson-400 transition-colors duration-100" />
                        <div className="text-left">
                            <div className="font-mono text-xs uppercase tracking-widest font-bold text-white/80">Steam API key</div>
                            <div className="font-mono text-[10px] text-white/40 mt-0.5">Optional — only for private profiles</div>
                        </div>
                    </div>
                    <div className="flex items-center gap-3">
                        <span className={`px-2 py-0.5 text-[9px] font-mono font-black uppercase tracking-widest border ${hasStoredKey ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : 'text-white/40 border-white/15'}`}>
                            {hasStoredKey ? 'Set' : 'Not set'}
                        </span>
                        <ChevronDown className={`w-4 h-4 text-white/30 transition-transform duration-200 ${keyExpanded ? 'rotate-180' : ''}`} />
                    </div>
                </button>

                <AnimatePresence initial={false}>
                    {keyExpanded && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                            className="overflow-hidden"
                        >
                            <div className="px-4 pb-4 pt-1 space-y-3 border-t border-white/5">
                                <div className="flex items-center gap-2">
                                    <input
                                        type="password"
                                        value={apiKey}
                                        onChange={(e) => { setApiKey(e.target.value); setApiKeyError(null); setApiKeySaved(false) }}
                                        onKeyDown={(e) => { if (e.key === 'Enter') onSaveKey() }}
                                        placeholder={hasStoredKey ? 'Paste new key to replace' : 'Paste your key'}
                                        className="flex-1 px-3 py-2 bg-void-pure border border-white/15 focus:border-crimson-500/60 focus:outline-none text-xs font-mono text-white placeholder:text-white/25 tracking-wider"
                                    />
                                    <button
                                        onClick={onSaveKey}
                                        className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest border border-crimson-500/50 text-crimson-300 hover:bg-crimson-500/10 hover:border-crimson-500 transition-colors duration-100 flex items-center gap-1.5"
                                    >
                                        {apiKeySaved ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                                        Save
                                    </button>
                                    {hasStoredKey && (
                                        <button
                                            onClick={onClearKey}
                                            className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest border border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/40 transition-colors duration-100"
                                        >
                                            Clear
                                        </button>
                                    )}
                                </div>

                                <div className="flex items-center justify-between text-[10px] font-mono">
                                    {apiKeyError ? (
                                        <span className="text-red-400 uppercase tracking-widest">{apiKeyError}</span>
                                    ) : (
                                        <button
                                            onClick={() => openUrl('https://steamcommunity.com/dev/apikey')}
                                            className="text-white/40 hover:text-crimson-300 transition-colors duration-100 uppercase tracking-widest flex items-center gap-1.5"
                                        >
                                            Get a key from Steam
                                            <ExternalLink className="w-2.5 h-2.5" />
                                        </button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}
