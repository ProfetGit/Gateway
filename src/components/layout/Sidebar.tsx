import { motion } from 'framer-motion'
import {
    Gamepad2,
    Heart,
    Settings,
    Library,
    CloudDownload,
} from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'

export function Sidebar() {
    const { filter, setFilter, openSettings } = useGameStore()

    return (
        <aside className="w-16 h-full bg-void-deep border-r border-void-border flex flex-col items-center py-6 shrink-0">
            {/* Navigation */}
            <nav className="flex flex-col items-center gap-2 flex-1">
                <NavButton
                    icon={<Library />}
                    label="All Games"
                    isActive={filter === 'all'}
                    onClick={() => setFilter('all')}
                />
                <NavButton
                    icon={<Gamepad2 />}
                    label="Installed"
                    isActive={filter === 'installed'}
                    onClick={() => setFilter('installed')}
                />
                <NavButton
                    icon={<CloudDownload />}
                    label="Not Installed"
                    isActive={filter === 'not-installed'}
                    onClick={() => setFilter('not-installed')}
                />
                <NavButton
                    icon={<Heart />}
                    label="Favorites"
                    isActive={filter === 'favorites'}
                    onClick={() => setFilter('favorites')}
                />
            </nav>

            {/* Settings */}
            <div className="mt-auto">
                <NavButton
                    icon={<Settings />}
                    label="Settings"
                    onClick={openSettings}
                />
            </div>
        </aside>
    )
}

interface NavButtonProps {
    icon: React.ReactNode
    label: string
    isActive?: boolean
    onClick: () => void
    variant?: 'default' | 'action'
}

function NavButton({ icon, label, isActive, onClick, variant = 'default' }: NavButtonProps) {
    return (
        <motion.button
            onClick={onClick}
            className={`
        relative w-10 h-10 flex items-center justify-center rounded-lg
        transition-colors duration-200 group
        ${isActive
                    ? 'text-crimson-500 bg-crimson-950/30'
                    : variant === 'action'
                        ? 'text-text-secondary hover:text-crimson-400 hover:bg-crimson-950/20'
                        : 'text-text-muted hover:text-text-primary hover:bg-void-surface'
                }
      `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={label}
        >
            {/* Active indicator - levitating pill */}
            {isActive && (
                <motion.div
                    className="absolute -left-3 w-1 h-5 bg-crimson-500 rounded-r-full"
                    layoutId="nav-indicator"
                    transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                />
            )}

            <span className="w-5 h-5">
                {icon}
            </span>

            {/* Tooltip */}
            <span className="
        absolute left-full ml-3 px-2 py-1 text-xs font-mono
        bg-void-elevated border border-void-border rounded
        text-text-secondary whitespace-nowrap
        opacity-0 scale-95 pointer-events-none
        transition-all duration-200
        group-hover:opacity-100 group-hover:scale-100
      ">
                {label}
            </span>
        </motion.button>
    )
}
