import { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { LogIn, LogOut, User } from 'lucide-react'
import type { AuthState } from '../../types/game'

interface SteamLoginProps {
    onLoginChange?: (authState: AuthState) => void
}

export function SteamLogin({ onLoginChange }: SteamLoginProps) {
    const [authState, setAuthState] = useState<AuthState>({
        isLoggedIn: false,
        user: null,
    })
    const [isLoading, setIsLoading] = useState(false)

    // Check auth state on mount
    useEffect(() => {
        window.api?.getAuthState().then(state => {
            setAuthState(state)
            onLoginChange?.(state)
        })
    }, [onLoginChange])

    const handleLogin = async () => {
        setIsLoading(true)
        try {
            const state = await window.api?.steamLogin()
            if (state) {
                setAuthState(state)
                onLoginChange?.(state)
            }
        } catch (error) {
            console.error('Login failed:', error)
        } finally {
            setIsLoading(false)
        }
    }

    const handleLogout = async () => {
        const state = await window.api?.steamLogout()
        if (state) {
            setAuthState(state)
            onLoginChange?.(state)
        }
    }

    if (authState.isLoggedIn && authState.user) {
        return (
            <div className="p-3 border-t border-void-border">
                <div className="flex items-center gap-3 mb-2">
                    {authState.user.avatarUrl ? (
                        <img
                            src={authState.user.avatarUrl}
                            alt={authState.user.username}
                            className="w-8 h-8 rounded-full"
                        />
                    ) : (
                        <div className="w-8 h-8 rounded-full bg-void-surface flex items-center justify-center">
                            <User className="w-4 h-4 text-text-muted" />
                        </div>
                    )}
                    <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-text-primary truncate">
                            {authState.user.username}
                        </p>
                        <p className="text-xs text-text-muted">Steam Connected</p>
                    </div>
                </div>
                <motion.button
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-void-surface hover:bg-void-border text-text-muted hover:text-text-primary text-xs font-medium rounded transition-colors"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Disconnect</span>
                </motion.button>
            </div>
        )
    }

    return (
        <div className="p-3 border-t border-void-border">
            <motion.button
                onClick={handleLogin}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-3 py-2.5 bg-[#1b2838] hover:bg-[#2a475e] text-white text-sm font-medium rounded transition-colors disabled:opacity-50"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
            >
                {isLoading ? (
                    <>
                        <motion.div
                            className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                        />
                        <span>Connecting...</span>
                    </>
                ) : (
                    <>
                        <LogIn className="w-4 h-4" />
                        <span>Login with Steam</span>
                    </>
                )}
            </motion.button>
            <p className="mt-2 text-xs text-text-ghost text-center">
                Connect to sync your full library
            </p>
        </div>
    )
}
