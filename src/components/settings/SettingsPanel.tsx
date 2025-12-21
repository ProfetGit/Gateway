import { motion, AnimatePresence } from 'framer-motion'
import { X, Database, Trash2, Download, Upload, LogIn, LogOut, User, Cloud } from 'lucide-react'
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
                // Reload games since login auto-syncs
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
                console.log(`Synced ${result.totalGames} games (${result.installedGames} installed)`)
                // Reload games from store
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
                    if (allGames) {
                        setGames(allGames)
                    }
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
                        className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={closeSettings}
                    />

                    {/* Panel - Slides from right */}
                    <motion.div
                        className="fixed right-0 top-0 bottom-0 w-full max-w-md z-50"
                        initial={{ x: '100%' }}
                        animate={{ x: 0 }}
                        exit={{ x: '100%' }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <div className="h-full bg-void-elevated border-l border-void-border flex flex-col">
                            {/* Header */}
                            <div className="flex items-center justify-between px-6 py-5 border-b border-void-border shrink-0">
                                <h2 className="text-lg font-semibold text-text-primary">Settings</h2>
                                <motion.button
                                    onClick={closeSettings}
                                    className="p-2 text-text-muted hover:text-text-primary hover:bg-void-surface rounded-lg transition-colors"
                                    whileHover={{ scale: 1.1 }}
                                    whileTap={{ scale: 0.9 }}
                                >
                                    <X className="w-5 h-5" />
                                </motion.button>
                            </div>

                            {/* Content */}
                            <div className="flex-1 overflow-y-auto p-6 space-y-8">
                                {/* Steam Account */}
                                <section>
                                    <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Cloud className="w-3.5 h-3.5" />
                                        Steam Account
                                    </h3>

                                    {authState.isLoggedIn && authState.user ? (
                                        <div className="bg-void-surface border border-void-border rounded-lg p-4">
                                            <div className="flex items-center gap-3 mb-4">
                                                {authState.user.avatarUrl ? (
                                                    <img
                                                        src={authState.user.avatarUrl}
                                                        alt={authState.user.username}
                                                        className="w-12 h-12 rounded-full"
                                                    />
                                                ) : (
                                                    <div className="w-12 h-12 rounded-full bg-void-deep flex items-center justify-center">
                                                        <User className="w-6 h-6 text-text-muted" />
                                                    </div>
                                                )}
                                                <div>
                                                    <p className="font-medium text-text-primary">
                                                        {authState.user.username}
                                                    </p>
                                                    <p className="text-xs text-text-muted">Connected via Steam</p>
                                                </div>
                                            </div>
                                            <div className="flex gap-2">
                                                <motion.button
                                                    onClick={handleSyncLibrary}
                                                    disabled={isFetching}
                                                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-crimson-600 hover:bg-crimson-500 text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    {isFetching ? (
                                                        <motion.div
                                                            className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                                                            animate={{ rotate: 360 }}
                                                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                        />
                                                    ) : (
                                                        <Download className="w-4 h-4" />
                                                    )}
                                                    <span>Sync Library</span>
                                                </motion.button>
                                                <motion.button
                                                    onClick={handleSteamLogout}
                                                    className="px-3 py-2 bg-void-deep hover:bg-void-border text-text-muted hover:text-text-primary text-sm rounded transition-colors"
                                                    whileHover={{ scale: 1.02 }}
                                                    whileTap={{ scale: 0.98 }}
                                                >
                                                    <LogOut className="w-4 h-4" />
                                                </motion.button>
                                            </div>
                                            <p className="mt-3 text-xs text-text-ghost">
                                                Syncs your full Steam library and detects installed games.
                                            </p>
                                        </div>
                                    ) : (
                                        <motion.button
                                            onClick={handleSteamLogin}
                                            disabled={isLoggingIn}
                                            className="w-full flex items-center justify-center gap-3 px-4 py-3 bg-[#1b2838] hover:bg-[#2a475e] text-white text-sm font-medium rounded-lg transition-colors disabled:opacity-50"
                                            whileHover={{ scale: 1.01 }}
                                            whileTap={{ scale: 0.99 }}
                                        >
                                            {isLoggingIn ? (
                                                <>
                                                    <motion.div
                                                        className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full"
                                                        animate={{ rotate: 360 }}
                                                        transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                                                    />
                                                    <span>Connecting to Steam...</span>
                                                </>
                                            ) : (
                                                <>
                                                    <LogIn className="w-5 h-5" />
                                                    <span>Login with Steam</span>
                                                </>
                                            )}
                                        </motion.button>
                                    )}
                                </section>

                                {/* Library Stats */}
                                <section>
                                    <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-4 flex items-center gap-2">
                                        <Database className="w-3.5 h-3.5" />
                                        Library Statistics
                                    </h3>
                                    <div className="grid grid-cols-2 gap-3">
                                        <StatBox label="Total Games" value={games.length} />
                                        <StatBox label="Installed" value={games.filter(g => g.isInstalled).length} />
                                        <StatBox label="Steam Games" value={games.filter(g => g.source === 'steam').length} />
                                        <StatBox label="Favorites" value={games.filter(g => g.isFavorite).length} />
                                    </div>
                                </section>

                                {/* Data Management */}
                                <section>
                                    <h3 className="text-xs font-mono text-text-muted uppercase tracking-wider mb-4">
                                        Data Management
                                    </h3>
                                    <div className="space-y-3">
                                        <SettingsButton
                                            icon={<Download className="w-4 h-4" />}
                                            label="Export Library"
                                            description="Save your library as a JSON file"
                                            onClick={handleExport}
                                        />
                                        <SettingsButton
                                            icon={<Upload className="w-4 h-4" />}
                                            label="Import Library"
                                            description="Load games from a JSON file"
                                            onClick={handleImport}
                                        />
                                    </div>
                                </section>

                                {/* Danger Zone */}
                                <section>
                                    <h3 className="text-xs font-mono text-red-400 uppercase tracking-wider mb-4">
                                        Danger Zone
                                    </h3>
                                    <SettingsButton
                                        icon={<Trash2 className="w-4 h-4" />}
                                        label="Clear Library"
                                        description="Remove all games from your library"
                                        onClick={handleClearLibrary}
                                        variant="danger"
                                    />
                                </section>
                            </div>

                            {/* Footer */}
                            <div className="px-6 py-4 border-t border-void-border shrink-0">
                                <p className="text-xs font-mono text-text-ghost text-center">
                                    Gateway v1.0.0 • Made with ♥
                                </p>
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

interface StatBoxProps {
    label: string
    value: number
}

function StatBox({ label, value }: StatBoxProps) {
    return (
        <div className="bg-void-surface border border-void-border rounded-lg p-3">
            <div className="text-2xl font-bold text-text-primary">{value}</div>
            <div className="text-xs font-mono text-text-muted">{label}</div>
        </div>
    )
}

interface SettingsButtonProps {
    icon: React.ReactNode
    label: string
    description: string
    onClick: () => void
    variant?: 'default' | 'danger'
}

function SettingsButton({ icon, label, description, onClick, variant = 'default' }: SettingsButtonProps) {
    return (
        <motion.button
            onClick={onClick}
            className={`
        w-full flex items-start gap-4 p-4 rounded-lg text-left transition-colors
        ${variant === 'danger'
                    ? 'bg-red-950/20 border border-red-900/30 hover:bg-red-950/40 hover:border-red-900/50'
                    : 'bg-void-surface border border-void-border hover:bg-void-elevated hover:border-crimson-900/30'
                }
      `}
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.99 }}
        >
            <div className={`mt-0.5 ${variant === 'danger' ? 'text-red-400' : 'text-text-muted'}`}>
                {icon}
            </div>
            <div>
                <div className={`font-medium ${variant === 'danger' ? 'text-red-400' : 'text-text-primary'}`}>
                    {label}
                </div>
                <div className="text-xs text-text-muted mt-0.5">{description}</div>
            </div>
        </motion.button>
    )
}
