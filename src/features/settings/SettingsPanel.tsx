import { motion, AnimatePresence } from 'framer-motion'
import { useGameStore } from '@/features/game-library/game-store'
import { useState, useEffect } from 'react'
import type { AuthState } from '@/features/auth/api/auth-schema'
import { getAuthState } from '@/features/auth/api/get-auth-state'
import { steamLogin } from '@/features/auth/api/steam-login'
import { steamLogout } from '@/features/auth/api/steam-logout'
import { onAuthStateUpdated } from '@/features/auth/api/on-auth-state-updated'
import { clearAndResync } from '@/features/game-library/api/clear-and-resync'
import { getGames } from '@/features/game-library/api/get-games'
import { deleteGame as apiDeleteGame } from '@/features/game-library/api/delete-game'
import { SettingsHeader, type SettingsTabId } from './SettingsHeader'
import { SteamAccountSection } from './SteamAccountSection'
import { LibraryPreferencesSection } from './LibraryPreferencesSection'
import { DangerZoneSection } from './DangerZoneSection'
import { AboutSection } from './AboutSection'
import { LaunchDefaultsSection } from './LaunchDefaultsSection'
import { GameSourcesSection } from './GameSourcesSection'
import { useLibraryStats } from './use-library-stats'
import { useSteamApiKey } from './use-steam-api-key'

export function SettingsPanel() {
    const { isSettingsOpen, closeSettings, games, setGames } = useGameStore()
    const [tab, setTab] = useState<SettingsTabId>('account')
    const [authState, setAuthState] = useState<AuthState>({ isLoggedIn: false, user: null })
    const [isLoggingIn, setIsLoggingIn] = useState(false)
    const [isFetching, setIsFetching] = useState(false)
    const steamKey = useSteamApiKey(isSettingsOpen)

    useEffect(() => {
        if (isSettingsOpen) {
            getAuthState().then(setAuthState).catch(() => {})
            setTab('account')
        }
    }, [isSettingsOpen])

    // Refresh avatar when backend backfills it after API key is saved
    useEffect(() => {
        let unlisten: (() => void) | undefined
        onAuthStateUpdated((state) => setAuthState(state)).then((fn) => { unlisten = fn })
        return () => { unlisten?.() }
    }, [])

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

    const stats = useLibraryStats(games)

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

                            <SettingsHeader tab={tab} setTab={setTab} libraryCount={stats.total} onClose={closeSettings} />

                            <div className="flex-1 overflow-y-auto p-6 space-y-6 [scrollbar-gutter:stable] relative z-10">
                                {tab === 'account' && (
                                    <SteamAccountSection
                                        authState={authState}
                                        isLoggingIn={isLoggingIn}
                                        onLogin={handleSteamLogin}
                                        onLogout={handleSteamLogout}
                                        hasStoredKey={steamKey.hasStoredKey}
                                        keyExpanded={steamKey.keyExpanded}
                                        setKeyExpanded={steamKey.setKeyExpanded}
                                        apiKey={steamKey.apiKey}
                                        setApiKey={steamKey.setApiKey}
                                        setApiKeyError={steamKey.setApiKeyError}
                                        setApiKeySaved={steamKey.setApiKeySaved}
                                        apiKeyError={steamKey.apiKeyError}
                                        apiKeySaved={steamKey.apiKeySaved}
                                        onSaveKey={steamKey.onSaveKey}
                                        onClearKey={steamKey.onClearKey}
                                    />
                                )}

                                {tab === 'library' && (
                                    <div className="space-y-6">
                                        <LibraryPreferencesSection
                                            stats={stats}
                                            isFetching={isFetching}
                                            canRefresh={authState.isLoggedIn}
                                            onRefresh={handleSyncLibrary}
                                        />
                                        <DangerZoneSection onClear={handleClearLibrary} />
                                    </div>
                                )}

                                {tab === 'sources' && (
                                    <GameSourcesSection />
                                )}

                                {tab === 'launch' && (
                                    <LaunchDefaultsSection />
                                )}

                                {tab === 'about' && (
                                    <AboutSection />
                                )}
                            </div>
                        </div>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}
