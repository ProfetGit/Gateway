import { motion } from 'framer-motion'
import {
    Settings,
    Library,
    Home,
} from 'lucide-react'
import { useGameStore } from '../../stores/gameStore'

export function Sidebar() {
    const { setFilterStatus, openSettings, currentView, setView } = useGameStore()

    return (
        <aside className="w-20 h-full bg-void-pure border-r border-void-border/30 flex flex-col items-center py-8 shrink-0 relative z-50">
            {/* Ambient shine */}
            <div className="absolute top-0 inset-x-0 h-32 bg-gradient-to-b from-crimson-900/10 to-transparent pointer-events-none" />
            {/* Navigation */}
            <nav className="flex flex-col items-center gap-2 flex-1">
                <NavButton
                    icon={<Home />}
                    label="Home"
                    isActive={currentView === 'home'}
                    onClick={() => setView('home')}
                />
                <div className="w-6 h-px bg-void-border my-2" />
                <NavButton
                    icon={<Library />}
                    label="Library"
                    isActive={currentView === 'library'}
                    onClick={() => {
                        setView('library')
                        setFilterStatus('all')
                    }}
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
        </aside >
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
        relative w-12 h-12 flex items-center justify-center rounded-sm
        transition-all duration-300 group
        ${isActive
                    ? 'text-white'
                    : variant === 'action'
                        ? 'text-white/40 hover:text-crimson-400 hover:bg-crimson-900/10'
                        : 'text-white/40 hover:text-white hover:bg-white/5'
                }
      `}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            title={label}
        >
            {/* Active indicator - Tech Spine */}
            {isActive && (
                <motion.div
                    className="absolute inset-0 border-l-[3px] border-crimson-500 bg-gradient-to-r from-crimson-500/10 to-transparent"
                    layoutId="nav-indicator"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                />
            )}

            {/* Hover Glitch Border */}
            <div className={`absolute inset-0 border border-transparent transition-colors duration-300 ${!isActive && 'group-hover:border-white/10'}`} />

            <span className={`relative z-10 w-6 h-6 transition-transform duration-300 ${isActive ? 'scale-110 drop-shadow-[0_0_10px_rgba(220,38,38,0.5)]' : 'group-hover:scale-110'}`}>
                {icon}
            </span>

            {/* Tooltip - Mechanical Label */}
            <div className="
        absolute left-full ml-4 px-3 py-1.5 
        bg-void-deep border border-white/10 
        text-xs font-mono font-bold tracking-[0.2em] uppercase
        text-white whitespace-nowrap
        opacity-0 -translate-x-2 pointer-events-none
        transition-all duration-300
        group-hover:opacity-100 group-hover:translate-x-0
        shadow-[0_4px_20px_rgba(0,0,0,0.5)]
        backdrop-blur-md
      ">
                {label}
                {/* Decorative corner */}
                <div className="absolute top-0 right-0 w-1.5 h-1.5 border-t border-r border-crimson-500/50" />
            </div>
        </motion.button>
    )
}
