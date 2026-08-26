import { useState } from 'react'
import { motion } from 'framer-motion'
import { Trophy, X, Award, AlertTriangle } from 'lucide-react'
import { useToastStore, type Toast } from './toast-store'

const EYEBROW: Record<Toast['variant'], string> = {
    info: 'Gateway',
    celebration: 'Achievement unlocked',
    milestone: '100% complete',
    problem: 'Something went wrong',
}

export function ToastItem({ toast }: { toast: Toast }) {
    const dismiss = useToastStore((s) => s.dismiss)
    const [iconFailed, setIconFailed] = useState(false)

    const isMilestone = toast.variant === 'milestone'
    const isProblem = toast.variant === 'problem'
    const accent = isMilestone ? 'border-amber-500/60' : 'border-crimson-500/50'
    const glow = isMilestone
        ? 'shadow-[0_8px_40px_oklch(0.78_0.17_75/0.28)]'
        : 'shadow-[0_8px_40px_oklch(0.58_0.245_25/0.28)]'

    return (
        <motion.div
            layout
            // One-shot entrance spring is allowed; hover/exit stay on easing.
            initial={{ opacity: 0, x: 40, scale: 0.94 }}
            animate={{ opacity: 1, x: 0, scale: 1 }}
            exit={{ opacity: 0, x: 24, scale: 0.97, transition: { duration: 0.18, ease: [0.7, 0, 0.84, 0] } }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className={`pointer-events-auto relative overflow-hidden bg-void-elevated border ${accent} ${glow} rounded-lg ${isMilestone ? 'w-96' : 'w-80'}`}
        >
            {/* Corner brackets — shared card vocabulary */}
            <div className={`absolute top-0 left-0 w-5 h-5 border-t-2 border-l-2 ${isMilestone ? 'border-amber-400' : 'border-crimson-400'} pointer-events-none`} />
            <div className={`absolute bottom-0 right-0 w-5 h-5 border-b-2 border-r-2 ${isMilestone ? 'border-amber-400' : 'border-crimson-400'} pointer-events-none`} />

            {/* Scanlines */}
            <div className="absolute inset-0 bg-[repeating-linear-gradient(0deg,transparent,transparent_2px,oklch(0_0_0/0.04)_3px)] pointer-events-none" />

            <div className="relative flex gap-3 p-4 pr-9">
                <div className="shrink-0">
                    {toast.iconUrl && !iconFailed ? (
                        <img
                            src={toast.iconUrl}
                            alt=""
                            aria-hidden
                            onError={() => setIconFailed(true)}
                            className={`w-12 h-12 object-cover border ${isMilestone ? 'border-amber-500/40' : 'border-crimson-500/40'}`}
                        />
                    ) : (
                        <div className={`w-12 h-12 flex items-center justify-center border ${isMilestone ? 'border-amber-500/40 bg-amber-500/10' : 'border-crimson-500/40 bg-crimson-500/10'}`}>
                            {isMilestone && <Award className="w-6 h-6 text-amber-400" />}
                            {isProblem && <AlertTriangle className="w-6 h-6 text-crimson-500" />}
                            {!isMilestone && !isProblem && <Trophy className="w-6 h-6 text-crimson-500" />}
                        </div>
                    )}
                </div>

                <div className="min-w-0 flex-1">
                    <p className={`text-[9px] font-mono font-black uppercase tracking-widest mb-1 ${isMilestone ? 'text-amber-400' : 'text-crimson-400'}`}>
                        {EYEBROW[toast.variant]}
                    </p>
                    <h4 className={`${isMilestone ? 'text-etched text-base' : 'font-display font-bold text-sm'} text-white leading-tight ${isProblem ? '' : 'truncate'}`}>
                        {toast.title}
                    </h4>
                    {toast.message && (
                        <p className={`text-xs text-white/50 mt-0.5 ${isProblem ? '' : 'truncate'}`}>{toast.message}</p>
                    )}
                    {toast.action && (
                        <button
                            type="button"
                            onClick={() => {
                                toast.action?.onClick()
                                dismiss(toast.id)
                            }}
                            className="mt-2 text-[10px] font-mono font-bold uppercase tracking-widest text-white/50 hover:text-crimson-300 transition-colors duration-100 ease-out-expo"
                        >
                            {toast.action.label}
                        </button>
                    )}
                </div>
            </div>

            <button
                type="button"
                onClick={() => dismiss(toast.id)}
                title="Dismiss"
                className="absolute top-2 right-2 p-1 text-white/25 hover:text-white/70 transition-colors duration-100 ease-out-expo"
            >
                <X className="w-3.5 h-3.5" />
            </button>

            {/* Dwell timer — scaleX so nothing lays out */}
            <motion.div
                className={`absolute bottom-0 left-0 right-0 h-0.5 origin-left ${isMilestone ? 'bg-amber-500/70' : 'bg-crimson-500/70'}`}
                initial={{ scaleX: 1 }}
                animate={{ scaleX: 0 }}
                transition={{ duration: toast.durationMs / 1000, ease: 'linear' }}
            />
        </motion.div>
    )
}
