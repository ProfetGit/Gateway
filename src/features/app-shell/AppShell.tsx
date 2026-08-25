import { motion } from 'framer-motion'
import { Minus, Square, X } from 'lucide-react'
import { getCurrentWindow } from '@/lib/window-controls'

interface AppShellProps {
    children: React.ReactNode
}

export function AppShell({ children }: AppShellProps) {
    return (
        <div className="h-screen w-screen flex flex-col bg-void-pure overflow-hidden">
            {/* Custom Title Bar */}
            <header className="h-10 flex items-center justify-between px-4 bg-void-deep border-b border-void-border drag-region shrink-0">
                {/* Logo / Title */}
                <div className="flex items-center gap-3 no-drag">
                    <span className="text-sm font-mono text-text-secondary uppercase tracking-widest">
                        Gateway
                    </span>
                </div>

                {/* Window Controls */}
                <div className="flex items-center gap-1 no-drag">
                    <WindowButton
                        icon={<Minus className="w-3 h-3" />}
                        onClick={() => getCurrentWindow().minimize()}
                        hoverColor="text-text-primary"
                    />
                    <WindowButton
                        icon={<Square className="w-2.5 h-2.5" />}
                        onClick={() => getCurrentWindow().toggleMaximize()}
                        hoverColor="text-text-primary"
                    />
                    <WindowButton
                        icon={<X className="w-3.5 h-3.5" />}
                        onClick={() => getCurrentWindow().close()}
                        hoverColor="text-crimson-500"
                        hoverBg="bg-crimson-950/50"
                    />
                </div>
            </header>

            {/* Main Content */}
            <main className="flex-1 flex flex-col overflow-hidden">
                {children}
            </main>
        </div>
    )
}

interface WindowButtonProps {
    icon: React.ReactNode
    onClick: () => void
    hoverColor?: string
    hoverBg?: string
}

function WindowButton({ icon, onClick, hoverColor = 'text-text-primary', hoverBg = 'bg-void-surface' }: WindowButtonProps) {
    return (
        <motion.button
            onClick={onClick}
            className={`w-10 h-8 flex items-center justify-center text-text-muted transition-colors hover:${hoverColor} hover:${hoverBg}`}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
        >
            {icon}
        </motion.button>
    )
}
