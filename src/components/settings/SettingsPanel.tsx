import { motion, AnimatePresence } from 'framer-motion'
import { X, Trash2, LogIn, LogOut, RefreshCw, KeyRound, ExternalLink, Check, ChevronDown, User as UserIcon, Library, Info } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useState, useEffect, useMemo } from 'react'
import type { AuthState } from '../../types/game'
import {
    getAuthState, getSteamApiKey, setSteamApiKey, steamLogin, steamLogout,
    clearAndResync, getGames, deleteGame as apiDeleteGame, openUrl,
    onAuthStateUpdated,
} from '../../lib/api'

type TabId = 'account' | 'library' | 'about'

export function SettingsPanel() {
    const { isSettingsOpen, closeSettings, games, setGames } = useGameStore()
    const [tab, setTab] = useState<TabId>('account')
    const [authState, setAuthState] = useState<AuthState>({ isLoggedIn: false, user: null })
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [isFetching, setIsFetching] = useState(false)
    const [apiKey, setApiKey] = useState('')
    const [apiKeySaved, setApiKeySaved] = useState(false)
    const [apiKeyError, setApiKeyError] = useState<string | null>(null)
    const [hasStoredKey, setHasStoredKey] = useState(false)
    const [keyExpanded, setKeyExpanded] = useState(false)

    useEffect(() => {
        if (isSettingsOpen) {
            getAuthState().then(setAuthState).catch(() => {})
            getSteamApiKey().then((k) => {
                setHasStoredKey(!!k)
                setApiKey('')
                setApiKeySaved(false)
                setApiKeyError(null)
                setKeyExpanded(false)
            }).catch(() => {})
            setTab('account')
        }
    }, [isSettingsOpen])

    // Refresh avatar when backend backfills it after API key is saved
    useEffect(() => {
        let unlisten: (() => void) | undefined
        onAuthStateUpdated((state) => setAuthState(state)).then((fn) => { unlisten = fn })
        return () => { unlisten?.() }
    }, [])

    const handleSaveApiKey = async () => {
        const trimmed = apiKey.trim()
        if (!trimmed) { setApiKeyError('Paste a key first'); return }
        if (!/^[A-F0-9]{32}$/i.test(trimmed)) { setApiKeyError('Keys are 32 hex characters'); return }
        setApiKeyError(null)
        const result = await setSteamApiKey(trimmed)
        if (result?.success) {
            setHasStoredKey(true)
            setApiKey('')
            setApiKeySaved(true)
            setTimeout(() => setApiKeySaved(false), 2000)
        }
    }

    const handleClearApiKey = async () => {
        await setSteamApiKey('')
        setHasStoredKey(false)
        setApiKey('')
    }

    const handleSteamLogin = async () => {
        setIsLoggingIn(true)
        try {
            const state = await steamLogin()
            if (state) {
                setAuthState(state)
                const allGames = await getGames()
                if (allGames) setGames(allGames)
            }
        } catch (error) {
            console.error('Login failed:', error)
        } finally {
            setIsLoggingIn(false)
        }
    }

    const handleSteamLogout = async () => {
        const state = await steamLogout()
        if (state) setAuthState(state)
    }

    const handleSyncLibrary = async () => {
        setIsFetching(true)
        try {
            const result = await clearAndResync()
            if (result && !result.success) {
                alert(result.error || "Couldn't refresh your Steam library")
            }
            const allGames = await getGames()
            if (allGames) setGames(allGames)
        } catch (error) {
            console.error('Sync failed:', error)
            alert("Something went wrong.")
        } finally {
            setIsFetching(false)
        }
    }

    const handleClearLibrary = async () => {
        if (confirm('Are you sure you want to clear all games from your library? This cannot be undone.')) {
            for (const game of games) {
                await apiDeleteGame(game.id)
            }
            setGames([])
        }
    }

    const stats = useMemo(() => {
        const steam = games.filter(g => g.source === 'steam').length
        const installed = games.filter(g => g.isInstalled).length
        const sources = [
            { key: 'steam', label: 'Steam', count: steam },
        ].filter(s => s.count > 0)
        return { total: games.length, installed, sources }
    }, [games])

    return (
        <AnimatePresence>
            {isSettingsOpen && (
                <>
                    <motion.div
                        className="fixed inset-0 bg-void-pure/80 backdrop-blur-md z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeSettings}
                    />

                    <motion.div
                        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl z-50 overflow-hidden"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="h-full bg-void-pure border-l border-white/10 flex flex-col relative">
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0)_3px)] opacity-[0.04] pointer-events-none" />

                            {/* Compact header + tabs */}
                            <div className="relative shrink-0 border-b border-white/10 bg-void-pure">
                                <div className="px-6 pt-5 pb-3 flex items-center justify-between">
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-2xl font-display font-black text-white italic tracking-tighter uppercase transform -skew-x-6">
                                            Settings
                                            <span className="text-white/15 ml-2 text-lg">///</span>
                                        </h2>
                                    </div>
                                    <button
                                        onClick={closeSettings}
                                        className="group relative p-2.5 hover:bg-white/5 transition-colors duration-100 border border-white/10 hover:border-crimson-500/50"
                                    >
                                        <X className="w-4 h-4 text-white/60 group-hover:text-crimson-500 transition-colors duration-100" />
                                    </button>
                                </div>

                                <div className="px-6 flex items-center gap-1">
                                    <TabButton id="account" active={tab} setTab={setTab} icon={<UserIcon className="w-3.5 h-3.5" />} label="Account" />
                                    <TabButton id="library" active={tab} setTab={setTab} icon={<Library className="w-3.5 h-3.5" />} label="Library" badge={stats.total} />
                                    <TabButton id="about" active={tab} setTab={setTab} icon={<Info className="w-3.5 h-3.5" />} label="About" />
                                </div>
                            </div>

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 scrollbar-hide relative z-10">
                                {tab === 'account' && (
                                    <AccountTab
                                        authState={authState}
                                        isLoggingIn={isLoggingIn}
                                        onLogin={handleSteamLogin}
                                        onLogout={handleSteamLogout}
                                        hasStoredKey={hasStoredKey}
                                        keyExpanded={keyExpanded}
                                        setKeyExpanded={setKeyExpanded}
                                        apiKey={apiKey}
                                        setApiKey={setApiKey}
                                        setApiKeyError={setApiKeyError}
                                        setApiKeySaved={setApiKeySaved}
                                        apiKeyError={apiKeyError}
                                        apiKeySaved={apiKeySaved}
                                        onSaveKey={handleSaveApiKey}
                                        onClearKey={handleClearApiKey}
                                    />
                                )}

                                {tab === 'library' && (
                                    <LibraryTab
                                        stats={stats}
                                        isFetching={isFetching}
                                        canRefresh={authState.isLoggedIn}
                                        onRefresh={handleSyncLibrary}
                                        onClear={handleClearLibrary}
                                    />
                                )}

                                {tab === 'about' && (
                                    <AboutTab />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// --- TABS ---

function TabButton({ id, active, setTab, icon, label, badge }: { id: TabId, active: TabId, setTab: (t: TabId) => void, icon: React.ReactNode, label: string, badge?: number }) {
    const isActive = active === id
    return (
        <button
            onClick={() => setTab(id)}
            className={`relative flex items-center gap-2 px-4 py-2.5 font-mono text-[11px] uppercase tracking-widest font-bold transition-colors duration-100 ${isActive ? 'text-white' : 'text-white/40 hover:text-white/70'}`}
        >
            {icon}
            <span>{label}</span>
            {typeof badge === 'number' && badge > 0 && (
                <span className={`text-[9px] font-mono tracking-wider ${isActive ? 'text-crimson-400' : 'text-white/30'}`}>
                    {badge}
                </span>
            )}
            {isActive && (
                <motion.div
                    layoutId="settings-tab-underline"
                    className="absolute -bottom-px left-0 right-0 h-0.5 bg-crimson-500"
                    transition={{ duration: 0.2, ease: [0.16, 1, 0.3, 1] }}
                />
            )}
        </button>
    )
}

function AccountTab(props: {
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
}) {
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

function LibraryTab({ stats, isFetching, canRefresh, onRefresh, onClear }: {
    stats: { total: number, installed: number, sources: { key: string, label: string, count: number }[] }
    isFetching: boolean
    canRefresh: boolean
    onRefresh: () => void
    onClear: () => void
}) {
    const showSourceCards = stats.sources.length > 1
    const gridCols = stats.sources.length === 2 ? 'grid-cols-2' : 'grid-cols-3'

    return (
        <div className="space-y-6">
            {/* Headline numbers */}
            <div className="bg-white/5 border border-white/10 p-5">
                <div className="flex items-baseline gap-6">
                    <div>
                        <div className="text-4xl font-display font-black italic tracking-tighter text-white leading-none">
                            {stats.total}
                        </div>
                        <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-2">
                            Games
                        </div>
                    </div>
                    <div className="w-px h-10 bg-white/10" />
                    <div>
                        <div className="text-4xl font-display font-black italic tracking-tighter text-crimson-500 leading-none">
                            {stats.installed}
                        </div>
                        <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-2">
                            Installed
                        </div>
                    </div>
                    {!showSourceCards && stats.sources[0] && (
                        <>
                            <div className="w-px h-10 bg-white/10" />
                            <div>
                                <div className="text-4xl font-display font-black italic tracking-tighter text-white/80 leading-none">
                                    {stats.sources[0].count}
                                </div>
                                <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase mt-2">
                                    From {stats.sources[0].label}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>

            {/* Source breakdown only when multiple sources active */}
            {showSourceCards && (
                <div className={`grid gap-3 ${gridCols}`}>
                    {stats.sources.map((s, i) => (
                        <div key={s.key} className="bg-white/5 border border-white/10 p-4">
                            <div className={`text-2xl font-display font-black italic tracking-tighter mb-1 ${i === 0 ? 'text-white' : 'text-crimson-500'}`}>
                                {s.count}
                            </div>
                            <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase">
                                {s.label}
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div className="space-y-2">
                <button
                    onClick={onRefresh}
                    disabled={isFetching || !canRefresh}
                    className="w-full flex items-center justify-center gap-3 px-5 py-3.5 bg-crimson-600 border border-crimson-500 hover:bg-crimson-500 text-white font-display font-black italic tracking-wider uppercase text-base transition-colors duration-100 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                    <RefreshCw className={`w-4 h-4 ${isFetching ? 'animate-spin' : ''}`} />
                    {isFetching ? "Refreshing..." : "Refresh Library"}
                </button>
                {!canRefresh && (
                    <p className="font-mono text-[10px] text-white/40 uppercase tracking-widest text-center">
                        Sign in to Steam first
                    </p>
                )}
            </div>

            {/* Danger — text-link, no full red panel */}
            <div className="pt-4 border-t border-white/5 flex items-center justify-between">
                <div>
                    <div className="font-mono text-[11px] uppercase tracking-widest text-white/50 font-bold">Clear library</div>
                    <div className="font-mono text-[10px] text-white/30 mt-0.5">Removes all games. Cannot be undone.</div>
                </div>
                <button
                    onClick={onClear}
                    className="px-3 py-2 border border-red-500/30 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 font-mono text-[10px] uppercase tracking-widest font-bold transition-colors duration-100 flex items-center gap-1.5"
                >
                    <Trash2 className="w-3 h-3" />
                    Clear
                </button>
            </div>
        </div>
    )
}

function AboutTab() {
    return (
        <div className="space-y-4">
            <div className="bg-white/5 border border-white/10 p-6 text-center">
                <div className="text-3xl font-display font-black italic tracking-tighter text-white uppercase mb-2 -skew-x-6">
                    Gateway
                </div>
                <div className="font-mono text-[11px] text-crimson-400 tracking-widest uppercase">
                    Version 1.0.0
                </div>
            </div>
        </div>
    )
}
