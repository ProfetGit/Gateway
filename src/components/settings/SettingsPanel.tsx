import { motion, AnimatePresence } from 'framer-motion'
import { X, Database, Trash2, Download, Upload, LogIn, LogOut, User, RefreshCw, HardDrive, ShieldAlert } from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'
import { useState, useEffect } from 'react'
import type { AuthState } from '../../types/game'

export function SettingsPanel() {
    const { isSettingsOpen, closeSettings, games, setGames } = useGameStore()
    const [authState, setAuthState] = useState<AuthState>({ isLoggedIn: false, user: null })
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [isFetching, setIsFetching] = useState(false)

    // Check auth state on mount
    useEffect(() => {
        if (isSettingsOpen) {
            window.api?.getAuthState().then(setAuthState)
        }
    }, [isSettingsOpen])

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
            const result = await window.api?.clearAndResync()
            if (result && !result.success) {
                alert(result.error || 'Failed to sync library')
            } else if (result && result.success) {
                const allGames = await window.api?.getGames()
                if (allGames) {
                    setGames(allGames)
                }
            }
        } catch (error) {
            console.error('Sync failed:', error)
            alert('An unexpected error occurred.')
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

    const handleExport = () => {
        const data = JSON.stringify(games, null, 2)
        const blob = new Blob([data], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const a = document.createElement('a')
        a.href = url
        a.download = 'gateway-library.json'
        a.click()
        URL.revokeObjectURL(url)
    }

    const handleImport = () => {
        const input = document.createElement('input')
        input.type = 'file'
        input.accept = '.json'
        input.onchange = async (e) => {
            const file = (e.target as HTMLInputElement).files?.[0]
            if (!file) return
            const text = await file.text()
            try {
                const importedGames = JSON.parse(text)
                if (Array.isArray(importedGames)) {
                    for (const game of importedGames) {
                        await window.api?.addGame(game)
                    }
                    const allGames = await window.api?.getGames()
                    if (allGames) setGames(allGames)
                }
            } catch (error) {
                console.error('Failed to import:', error)
                alert('Failed to import library. Invalid file format.')
            }
        }
        input.click()
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
                            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,#000_3px)] opacity-[0.1] pointer-events-none" />

                            {/* Header */}
                            <div className="relative px-8 py-8 border-b border-white/10 flex items-center justify-between shrink-0 bg-gradient-to-r from-void-pure to-void-pure/90">
                                <div>
                                    <div className="flex items-center gap-2 text-crimson-500 mb-1">
                                        <div className="w-2 h-2 bg-crimson-500 rounded-full animate-pulse" />
                                        <span className="font-mono text-[10px] tracking-[0.2em] uppercase">System_Config_Mode</span>
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
                                    <SectionHeader icon={<User className="w-4 h-4" />} title="User_Identity" />

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
                                                                ONLINE
                                                            </div>
                                                        </div>
                                                        <div>
                                                            <h3 className="text-2xl font-display font-black text-white uppercase tracking-tight italic">
                                                                {authState.user.username}
                                                            </h3>
                                                            <p className="font-mono text-xs text-crimson-400 tracking-widest mt-1">
                                                                STEAM_ID: {authState.user.steamId?.slice(0, 8)}...
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
                                                        label={isFetching ? "SYNCING..." : "FORCE_SYNC_LIBRARY"}
                                                        description="Update local cache from remote"
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
                                                <h3 className="text-xl font-bold text-white uppercase tracking-tight mb-2">No Uplink Detected</h3>
                                                <p className="font-mono text-xs text-white/40 mb-6 max-w-sm">
                                                    Connect to Steam Network to access your library and synchronize game data.
                                                </p>
                                                <BespokeButton
                                                    onClick={handleSteamLogin}
                                                    disabled={isLoggingIn}
                                                    icon={<LogIn className="w-4 h-4" />}
                                                    label={isLoggingIn ? "ESTABLISHING_LINK..." : "INITIATE_STEAM_UPLINK"}
                                                    variant="primary"
                                                />
                                            </div>
                                        )}
                                    </div>
                                </section>

                                {/* DATABASE METRICS */}
                                <section>
                                    <SectionHeader icon={<Database className="w-4 h-4" />} title="Database_Metrics" />
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                                        <StatMetric label="TOTAL_ENTRIES" value={games.length} />
                                        <StatMetric label="INSTALLED" value={games.filter(g => g.isInstalled).length} color="crimson" />
                                        <StatMetric label="FAVORITES" value={games.filter(g => g.isFavorite).length} />
                                        <StatMetric label="PLATFORM" value="STEAM" />
                                    </div>
                                </section>

                                {/* I/O OPERATIONS */}
                                <section>
                                    <SectionHeader icon={<HardDrive className="w-4 h-4" />} title="I/O_Operations" />
                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <BespokeButton
                                            icon={<Download className="w-4 h-4" />}
                                            label="EXPORT_DB"
                                            description="Backup library manifest"
                                            onClick={handleExport}
                                        />
                                        <BespokeButton
                                            icon={<Upload className="w-4 h-4" />}
                                            label="IMPORT_DB"
                                            description="Restore from backup"
                                            onClick={handleImport}
                                        />
                                    </div>
                                </section>

                                {/* DANGER ZONE */}
                                <section className="relative">
                                    <div className="absolute inset-0 bg-red-500/5 mix-blend-overlay pointer-events-none -m-4 rounded-lg" />
                                    <SectionHeader icon={<ShieldAlert className="w-4 h-4 text-red-500" />} title="Critical_Zone" className="text-red-500" />
                                    <div className="bg-red-950/20 border border-red-500/20 p-6">
                                        <div className="flex items-start justify-between gap-6">
                                            <div>
                                                <h4 className="text-red-500 font-bold uppercase tracking-wider mb-1">Purge Local Database</h4>
                                                <p className="font-mono text-xs text-red-400/60">
                                                    Irreversible action. All local metadata will be destroyed.
                                                </p>
                                            </div>
                                            <BespokeButton
                                                icon={<Trash2 className="w-4 h-4" />}
                                                label="EXECUTE_PURGE"
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
                                    Gateway OS v1.0.0 /// SYSTEM_READY
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
        primary: "bg-crimson-600 border border-crimson-500 hover:bg-crimson-500 text-white shadow-[0_0_20px_rgba(220,38,38,0.3)] hover:shadow-[0_0_30px_rgba(220,38,38,0.5)]",
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
