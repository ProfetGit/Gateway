
import { motion } from 'framer-motion'
import { useState, useEffect } from 'react'
import { User } from 'lucide-react'
import { useGameStore } from '@/features/game-library/game-store'
import { useUIStore } from '@/stores/ui-store'
import type { AuthState } from '@/features/auth/api/auth-schema'
import clsx from 'clsx'

export function TopNavigation() {
    const { currentView, setView, openSettings, setFilterStatus } = useGameStore()
    const { isScrolled } = useUIStore()
    const [authState, setAuthState] = useState<AuthState>({ isLoggedIn: false, user: null })

    useEffect(() => {
        import('@/features/auth/api/get-auth-state').then(({ getAuthState }) => getAuthState().then(setAuthState).catch(() => {}))
    }, [])

    const navItems = [
        { id: 'home', label: 'HOME' },
        { id: 'library', label: 'LIBRARY' },
    ] as const

    return (
        <nav className="w-full h-24 px-12 flex items-center justify-between shrink-0 select-none">
            {/* Left: Navigation Links */}
            <div className="flex items-center gap-16 pointer-events-auto">
                {navItems.map((item) => {
                    const isActive = currentView === item.id
                    return (
                        <button
                            key={item.id}
                            onClick={() => {
                                setView(item.id)
                                if (item.id === 'library') {
                                    setFilterStatus('all')
                                }
                            }}
                            className={clsx(
                                "relative group transition-all duration-500 ease-out-expo border outline-none",
                                isScrolled && currentView === 'home'
                                    ? "px-10 py-2 bg-void-surface/90 backdrop-blur-md border-white/5 shadow-void-float -skew-x-12 hover:bg-white/5 hover:border-crimson-500/30"
                                    : "px-0 py-2 border-transparent hover:opacity-100"
                            )}
                        >
                            <span className={clsx(
                                "block text-3xl font-display font-black italic tracking-tighter transition-all duration-500 uppercase mix-blend-screen",
                                isActive
                                    ? "text-crimson-500 drop-shadow-[0_0_15px_oklch(0.52_0.23_25/0.8)] scale-105"
                                    : "text-white/30 group-hover:text-white/80",
                                isScrolled && currentView === 'home' && "skew-x-12" // Counter-skew text
                            )}>
                                {item.label}
                            </span>

                            {/* Glowing Red Underline - Laser Style */}
                            {isActive && (
                                <motion.div
                                    layoutId="nav-underline"
                                    className="absolute left-0 right-0 -bottom-1 h-0.5 bg-crimson-500 shadow-[0_0_20px_oklch(0.52_0.23_25)]"
                                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                                >
                                    <div className="absolute inset-0 bg-crimson-400 blur-[4px]" />
                                </motion.div>
                            )}
                        </button>
                    )
                })}
            </div>

            {/* Right: Settings / Profile */}
            <div className="flex items-center gap-6 pointer-events-auto">
                <button
                    onClick={openSettings}
                    className="
                        group relative flex items-center justify-center w-12 h-12 
                        rounded-full border border-white/10 bg-white/5 
                        hover:bg-crimson-500/20 hover:border-crimson-500/80 
                        transition-all duration-300 backdrop-blur-sm overflow-hidden
                    "
                >
                    {authState.isLoggedIn && authState.user?.avatarUrl ? (
                        <img
                            src={authState.user.avatarUrl}
                            alt={authState.user.username}
                            className="w-full h-full object-cover rounded-full"
                        />
                    ) : (
                        <User className="w-5 h-5 text-white/50 group-hover:text-crimson-400 transition-colors" />
                    )}

                </button>
            </div>
        </nav>
    )
}
