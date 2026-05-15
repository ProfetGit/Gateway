import { motion, AnimatePresence } from 'framer-motion'
import { X, Database, Trash2, LogIn, LogOut, User, RefreshCw, ShieldAlert, KeyRound, ExternalLink, Wand2, Check } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useState, useEffect } from 'react'
import type { AuthState } from '../../types/game'

export function SettingsPanel() {
    const { isSettingsOpen, closeSettings, games, setGames, openSetupWizard } = useGameStore()
    const [authState, setAuthState] = useState<AuthState>({ isLoggedIn: false, user: null })
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [isFetching, setIsFetching] = useState(false)
    const [apiKey, setApiKey] = useState('')
    const [apiKeySaved, setApiKeySaved] = useState(false)
    const [apiKeyError, setApiKeyError] = useState<string | null>(null)
    const [hasStoredKey, setHasStoredKey] = useState(false)

    // Check auth state + API key presence on mount
    useEffect(() => {
        if (isSettingsOpen) {
            window.api?.getAuthState().then(setAuthState)
            window.api?.getSteamApiKey().then((k) => {
                setHasStoredKey(!!k)
                setApiKey('')
                setApiKeySaved(false)
                setApiKeyError(null)
            })
        }
    }, [isSettingsOpen])

    const handleSaveApiKey = async () => {
        const trimmed = apiKey.trim()
        if (!trimmed) { setApiKeyError('Paste a key first'); return }
        if (!/^[A-F0-9]{32}$/i.test(trimmed)) { setApiKeyError('Keys are 32 hex characters'); return }
        setApiKeyError(null)
        const result = await window.api?.setSteamApiKey(trimmed)
        if (result?.success) {
            setHasStoredKey(true)
            setApiKey('')
            setApiKeySaved(true)
            setTimeout(() => setApiKeySaved(false), 2000)
        }
    }

    const handleClearApiKey = async () => {
        await window.api?.setSteamApiKey('')
        setHasStoredKey(false)
        setApiKey('')
    }

    const handleSteamLogin = async () => {
        setIsLoggingIn(true)
        try {
            const state = await window.api?.steamLogin()
            if (state) {
                setAuthState(state)
                const allGames = await window.api?.getGames()
                if (allGames) {
                    setGames(allGames)
                }
            }
        } catch (error) {
            console.error('Login failed:', error)
        } finally {
            setIsLoggingIn(false)
        }
    }

    const handleSteamLogout = async () => {
        const state = await window.api?.steamLogout()
        if (state) {
            setAuthState(state)
        }
    }

    const handleSyncLibrary = async () => {
        setIsFetching(true)
        try {
            // Sync Steam first
            const result = await window.api?.clearAndResync()
            if (result && !result.success) {
                alert(result.error || "Couldn't refresh your Steam library")
            }

            // Then sync Lutris
            await window.api?.syncLutris()

            // Then sync Heroic
            await window.api?.syncHeroic()

            // Reload all games
            const allGames = await window.api?.getGames()
            if (allGames) {
                setGames(allGames)
            }
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
                await window.api?.deleteGame(game.id)
            }
            setGames([])
        }
    }

    return (
        <AnimatePresence>
            {isSettingsOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="fixed inset-0 bg-void-pure/80 backdrop-blur-md z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeSettings}
                    />

                    {/* Panel - "System Overlay" Style */}
                    <motion.div
                        className="fixed right-0 top-0 bottom-0 w-full max-w-2xl z-50 overflow-hidden"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="h-full bg-void-pure border-l border-white/10 flex flex-col relative">
                            {/* NOISE & SCANLINES */}
                            <div className="absolute inset-0 opacity-[0.03] pointer-events-none bg-[url('https://grainy-gradients.vercel.app/noise.svg')] bg-repeat mix-blend-overlay" />
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0)_3px)] opacity-[0.1] pointer-events-none" />

                            {/* Header */}
                            <div className="relative px-8 py-8 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-void-pure to-void-pure/90">
                                <div>
                                    <div className="flex items-center gap-2 text-crimson-500 mb-1">
                                        <div className="w-2 h-2 bg-crimson-500 rounded-full animate-pulse" />
                                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase">Settings</span>
                                    </div>
                                    <h2 className="text-4xl font-display font-black text-white italic tracking-tighter uppercase transform -skew-x-6">
                                        Settings
                                        <span className="text-white/20 ml-2">///</span>
                                    </h2>
                                </div>
                                <motion.button
                                    onClick={closeSettings}
                                    className="group relative p-4 hover:bg-white/5 transition-colors border border-white/10 hover:border-crimson-500/50"
                                    whileHover="hover"
                                    whileTap="tap"
                                >
                                    <X className="w-6 h-6 text-white/60 group-hover:text-crimson-500 transition-colors" />
                                    <span className="absolute top-0 right-0 w-2 h-2 border-t border-r border-white/20 group-hover:border-crimson-500" />
                                    <span className="absolute bottom-0 left-0 w-2 h-2 border-b border-l border-white/20 group-hover:border-crimson-500" />
                                </motion.button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-8 space-y-12 scrollbar-hide relative z-10">

                                {/* USER IDENTITY */}
                                <section>
                                    <SectionHeader icon={<User className="w-4 h-4" />} title="Account" />

                                    <div className="bg-white/5 border border-white/10 p-6 relative overflow-hidden group">


                                        {authState.isLoggedIn && authState.user ? (
                                            <div className="relative z-10">
                                                <div className="flex items-start justify-between mb-6">
                                                    <div className="flex items-center gap-6">
                                                        <div className="relative">
                                                            <div className="w-20 h-20 rounded-sm overflow-hidden border-2 border-crimson-500/30">
                                                                <img
                                                                    src={authState.user.avatarUrl}
                                                                    alt={authState.user.username}
                                                                    className="w-full h-full object-cover transition-all duration-500"
                                                                />
                                                            </div>
                                                            <div className="absolute -bottom-2 -right-2 bg-crimson-600 text-[10px] font-mono font-bold px-2 py-0.5 text-white">
                                                                Online
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight italic">
                                                                {authState.user.username}
                                                            </h3>
                                                            <p className="font-mono text-xs text-crimson-400 tracking-widest mt-1">
                                                                Signed in to Steam
                                                            </p>
                                                        </div>
                                                    </div>
                                                    <BespokeButton
                                                        onClick={handleSteamLogout}
                                                        icon={<LogOut className="w-4 h-4" />}
                                                        label="Disconnect"
                                                        variant="ghost"
                                                    />
                                                </div>

                                                <div className="w-full">
                                                    <BespokeButton
                                                        onClick={handleSyncLibrary}
                                                        disabled={isFetching}
                                                        icon={isFetching ? <RefreshCw className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                                        label={isFetching ? "Refreshing..." : "Refresh Library"}
                                                        description="Pull in your latest games"
                                                        variant="primary"
                                                        className="w-full"
                                                    />
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="relative z-10 flex flex-col items-center text-center py-6">
                                                <div className="w-16 h-16 bg-white/5 rounded-full flex items-center justify-center mb-4 border border-white/10">
                                                    <User className="w-8 h-8 text-white/40" />
                                                </div>
                                                <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-2">Not signed in</h3>
                                                <p className="font-mono text-xs text-white/40 mb-6 max-w-sm">
                                                    Sign in to Steam to load your games.
                                                </p>
                                                <BespokeButton
                                                    onClick={handleSteamLogin}
                                                    disabled={isLoggingIn}
                                                    icon={<LogIn className="w-4 h-4" />}
                                                    label={isLoggingIn ? "Connecting..." : "Connect Steam"}
                                                    variant="primary"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* DATABASE METRICS */}
                                <section>
                                    <SectionHeader icon={<Database className="w-4 h-4" />} title="Library Stats" />
                                    <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                                        <StatMetric label="Total Games" value={games.length} />
                                        <StatMetric label="Installed" value={games.filter(g => g.isInstalled).length} color="crimson" />
                                        <StatMetric label="Steam" value={games.filter(g => g.source === 'steam').length} />
                                        <StatMetric label="Lutris" value={games.filter(g => g.source === 'lutris').length} />
                                        <StatMetric label="Heroic" value={games.filter(g => g.source === 'heroic').length} color="crimson" />
                                    </div>
                                </section>

                                {/* STEAM WEB API KEY */}
                                <section>
                                    <SectionHeader icon={<KeyRound className="w-4 h-4" />} title="Steam Key" />
                                    <div className="bg-void-surface/40 border border-void-border/40 p-5 space-y-4">
                                        <div className="flex items-start justify-between gap-4">
                                            <p className="text-xs text-white/55 leading-relaxed max-w-md">
                                                Optional. With Steam sign-in done, Gateway reads your library from your active session — no key needed. Only paste a key if your Steam profile is private.
                                            </p>
                                            <span className={`shrink-0 px-2 py-1 text-[9px] font-mono font-black uppercase tracking-widest border ${hasStoredKey ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10' : 'text-white/40 border-white/15'}`}>
                                                {hasStoredKey ? 'Set' : 'Not Set'}
                                            </span>
                                        </div>

                                        <div className="flex items-center gap-2">
                                            <input
                                                type="password"
                                                value={apiKey}
                                                onChange={(e) => { setApiKey(e.target.value); setApiKeyError(null); setApiKeySaved(false) }}
                                                onKeyDown={(e) => { if (e.key === 'Enter') handleSaveApiKey() }}
                                                placeholder={hasStoredKey ? 'Paste new key to replace' : 'Paste your key'}
                                                className="flex-1 px-3 py-2 bg-void-pure border border-white/15 focus:border-crimson-500/60 focus:outline-none text-xs font-mono text-white placeholder:text-white/25 tracking-wider"
                                            />
                                            <button
                                                onClick={handleSaveApiKey}
                                                className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest border border-crimson-500/50 text-crimson-300 hover:bg-crimson-500/10 hover:border-crimson-500 transition-colors duration-200 flex items-center gap-1.5"
                                            >
                                                {apiKeySaved ? <Check className="w-3 h-3 text-emerald-400" /> : null}
                                                Save
                                            </button>
                                            {hasStoredKey && (
                                                <button
                                                    onClick={handleClearApiKey}
                                                    className="px-3 py-2 text-xs font-mono font-bold uppercase tracking-widest border border-white/10 text-white/50 hover:text-red-400 hover:border-red-500/40 transition-colors duration-200"
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
                                                    onClick={() => window.api?.openUrl('https://steamcommunity.com/dev/apikey')}
                                                    className="text-white/40 hover:text-crimson-300 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                                                >
                                                    Get a key from Steam
                                                    <ExternalLink className="w-2.5 h-2.5" />
                                                </button>
                                            )}
                                            <button
                                                onClick={() => { closeSettings(); openSetupWizard() }}
                                                className="text-white/40 hover:text-crimson-300 transition-colors uppercase tracking-widest flex items-center gap-1.5"
                                            >
                                                <Wand2 className="w-2.5 h-2.5" />
                                                Open setup again
                                            </button>
                                        </div>
                                    </div>
                                </section>

                                {/* DANGER ZONE */}
                                <section className="relative">
                                    <div className="absolute inset-0 bg-red-500/5 mix-blend-overlay pointer-events-none -m-4 rounded-lg" />
                                    <SectionHeader icon={<ShieldAlert className="w-4 h-4 text-red-500" />} title="Danger Zone" className="text-red-500" />
                                    <div className="bg-red-950/20 border border-red-500/20 p-6">
                                        <div className="flex items-start justify-between gap-6">
                                            <div>
                                                <h4 className="text-red-500 font-bold uppercase tracking-wider mb-1">Clear Library</h4>
                                                <p className="font-mono text-xs text-red-400/60">
                                                    This cannot be undone. All your games will be removed.
                                                </p>
                                            </div>
                                            <BespokeButton
                                                icon={<Trash2 className="w-4 h-4" />}
                                                label="Clear Library"
                                                onClick={handleClearLibrary}
                                                variant="danger"
                                            />
                                        </div>
                                    </div>
                                </section>

                            </div>

                            {/* Footer */}
                            <div className="p-6 border-t border-white/10 bg-void-pure text-center relative z-20">
                                <p className="font-mono text-[10px] text-white/20 uppercase tracking-[0.3em]">
                                    Gateway 1.0.0
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// --- SUBCOMPONENTS ---

function SectionHeader({ icon, title, className = "text-white/60" }: { icon: React.ReactNode, title: string, className?: string }) {
    return (
        <div className={`flex items-center gap-3 mb-6 ${className}`}>
            {icon}
            <h3 className="font-mono text-sm tracking-[0.2em] uppercase font-bold">
                {title}
            </h3>
            <div className="flex-1 h-px bg-current opacity-20" />
        </div>
    )
}

function StatMetric({ label, value, color = "white" }: { label: string, value: string | number, color?: "white" | "crimson" }) {
    const isCrimson = color === "crimson"
    return (
        <div className="bg-white/5 border border-white/10 p-4 relative group hover:bg-white/10 transition-colors">
            {/* Corner Markers */}
            <div className="absolute top-0 left-0 w-2 h-2 border-t border-l border-white/20 group-hover:border-white/50" />
            <div className="absolute bottom-0 right-0 w-2 h-2 border-b border-r border-white/20 group-hover:border-white/50" />

            <div className={`text-3xl font-display font-black italic tracking-tighter mb-1 ${isCrimson ? "text-crimson-500" : "text-white"}`}>
                {value}
            </div>
            <div className="font-mono text-[10px] text-white/40 tracking-widest uppercase">
                {label}
            </div>
        </div>
    )
}

interface BespokeButtonProps {
    icon: React.ReactNode
    label: string
    description?: string
    onClick: () => void
    variant?: 'default' | 'primary' | 'danger' | 'ghost'
    disabled?: boolean
    className?: string
}

function BespokeButton({ icon, label, description, onClick, variant = 'default', disabled, className = "" }: BespokeButtonProps) {
    const variants = {
        default: "bg-white/5 border border-white/10 hover:bg-white/10 text-white",
        primary: "bg-crimson-600 border border-crimson-500 hover:bg-crimson-500 text-white shadow-[0_0_20px_oklch(0.52_0.23_25/0.3)] hover:shadow-[0_0_30px_oklch(0.52_0.23_25/0.5)]",
        danger: "bg-red-500/10 border border-red-500/50 hover:bg-red-500/20 text-red-500",
        ghost: "bg-transparent border border-white/20 hover:border-white/50 text-white/80 hover:text-white"
    }

    return (
        <motion.button
            onClick={onClick}
            disabled={disabled}
            className={`
                group relative flex items-center gap-4 px-6 py-4 transition-all duration-300
                ${variants[variant]}
                disabled:opacity-50 disabled:grayscale
                ${className}
            `}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
        >
            {/* Tech Decoration */}
            {variant === 'primary' && (
                <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 mix-blend-overlay pointer-events-none" />
            )}

            <div className="relative z-10 flex flex-col items-start text-left">
                <div className="flex items-center gap-3 font-display font-black italic tracking-wider uppercase text-lg">
                    {icon}
                    <span>{label}</span>
                </div>
                {description && (
                    <span className="font-mono text-[10px] opacity-60 mt-1 uppercase tracking-wider pl-7">
                        {description}
                    </span>
                )}
            </div>

            {/* Hover Indicator */}
            <div className="absolute right-0 top-0 bottom-0 w-1 bg-current opacity-0 group-hover:opacity-100 transition-opacity" />
        </motion.button>
    )
}
