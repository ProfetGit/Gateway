import { Download, Play } from 'lucide-react'

/**
 * The library card's launch strip, scaled up. Same clip-path fill and same
 * label-reveal, so the control the user clicked to get here is the control
 * waiting for them when they arrive.
 */
export function GameDetailLaunch({
    isInstalled, isInstalling, onClick,
}: { isInstalled: boolean; isInstalling: boolean; onClick: () => void }) {
    const label = isInstalled ? 'Launch' : isInstalling ? 'Installing' : 'Install'
    const Icon = isInstalled ? Play : Download

    const row = (tone: string) => (
        <span
            className={`absolute inset-0 flex items-center justify-center gap-[0.7em] font-mono font-bold uppercase tracking-[0.2em] text-xs ${tone}`}
            style={{ WebkitFontSmoothing: 'antialiased' }}
        >
            <Icon className={`w-[15px] h-[15px] ${isInstalled ? 'fill-current' : ''}`} />
            {label}
        </span>
    )

    return (
        <button
            onClick={onClick}
            disabled={isInstalling}
            aria-label={label}
            className="group/launch relative h-12 w-full overflow-hidden bg-void-pure/90 border border-crimson-500/45 hover:border-crimson-500 disabled:opacity-60 transition-colors duration-100 ease-out-expo focus:outline-none focus-visible:ring-1 focus-visible:ring-inset focus-visible:ring-crimson-400"
        >
            <span className="absolute inset-0 bg-crimson-600 [clip-path:inset(0_100%_0_0)] group-hover/launch:[clip-path:inset(0)] transition-[clip-path] duration-100 ease-out-expo group-hover/launch:duration-[240ms]" />
            {row('text-crimson-300')}
            <span
                aria-hidden
                className="absolute inset-0 [clip-path:inset(0_100%_0_0)] group-hover/launch:[clip-path:inset(0)] transition-[clip-path] duration-100 ease-out-expo group-hover/launch:duration-[240ms]"
            >
                {row('text-white')}
            </span>
        </button>
    )
}
