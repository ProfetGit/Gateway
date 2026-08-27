import { motion } from 'framer-motion'
import { Gamepad2 } from 'lucide-react'
import type { AchievementGameSummary } from './achievements-surface-types'

export function AchievementGameRow({
    game, index, onClick,
}: { game: AchievementGameSummary; index: number; onClick: () => void }) {
    const remaining = game.total - game.unlocked

    return (
        <motion.button
            onClick={onClick}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: Math.min(index * 0.03, 0.4), duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
            className="group flex items-center gap-3.5 p-3 text-left bg-void-deep border border-void-border/55 hover:border-crimson-500/60 hover:-translate-y-[3px] transition-[border-color,transform] duration-100 ease-out-expo"
        >
            <div className="w-10 h-[53px] shrink-0 border border-void-border bg-void-surface overflow-hidden flex items-center justify-center">
                {game.coverSrc
                    ? <img src={game.coverSrc} alt="" className="w-full h-full object-cover" />
                    : <Gamepad2 className="w-4 h-4 text-white/20" />}
            </div>

            <div className="min-w-0 flex-1">
                <p className="text-sm font-display font-bold text-white truncate">{game.title}</p>
                <p className="mt-1 mb-2 text-[9px] font-mono font-bold uppercase tracking-[0.16em] text-white/32">
                    {game.unlocked} of {game.total} · {remaining} to go
                </p>
                <span className="relative block h-[3px] bg-void-border/60 overflow-hidden">
                    <motion.i
                        initial={{ scaleX: 0 }}
                        animate={{ scaleX: game.percentage / 100 }}
                        transition={{ delay: 0.18 + Math.min(index * 0.03, 0.3), duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 origin-left bg-crimson-500 shadow-[0_0_10px_oklch(0.58_0.245_25/0.6)]"
                    />
                </span>
            </div>

            <span className="shrink-0 font-display font-black italic text-xl tracking-tight text-white group-hover:text-crimson-100 transition-colors duration-100 ease-out-expo">
                {game.percentage}<span className="text-xs text-crimson-500">%</span>
            </span>
        </motion.button>
    )
}
