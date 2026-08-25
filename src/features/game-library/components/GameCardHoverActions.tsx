import { Download, Play } from 'lucide-react'

export type GameCardHoverActionsProps = {
    isInstalled: boolean
    onClick: (e: React.MouseEvent) => void
}

export function GameCardHoverActions({ isInstalled, onClick }: GameCardHoverActionsProps) {
    return (
        <div className="absolute inset-0 flex items-center justify-center z-30 pointer-events-none">
            <button
                onClick={onClick}
                className={`
                    group/hex relative flex items-center justify-center
                    transition-all duration-300 ease-out
                    opacity-0 scale-50 group-hover:opacity-100 group-hover:scale-100
                    pointer-events-auto cursor-pointer focus:outline-none
                    hover:!scale-110 active:!scale-95
                `}
                style={{ width: 60, height: 52 }}
            >
                {/* Hexagon shape using SVG for perfect symmetry */}
                <svg
                    viewBox="0 0 100 87"
                    className="absolute inset-0 w-full h-full overflow-visible"
                    style={{
                        filter: isInstalled
                            ? 'drop-shadow(0 0 20px oklch(0.52 0.23 25 / 0.7))'
                            : 'drop-shadow(0 4px 12px oklch(0.08 0.005 25 / 0.5))'
                    }}
                >
                    <defs>
                        {/* Installed gradient */}
                        <linearGradient id="hexGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="var(--color-crimson-600)" />
                            <stop offset="100%" stopColor="var(--color-crimson-800)" />
                        </linearGradient>

                        {/* Uninstalled ghost background */}
                        <linearGradient id="hexGradientGhost" x1="0%" y1="0%" x2="100%" y2="100%">
                            <stop offset="0%" stopColor="oklch(0.22 0.005 25 / 0.95)" />
                            <stop offset="100%" stopColor="oklch(0.16 0.005 25 / 0.95)" />
                        </linearGradient>

                        {/* Fill gradient for download animation */}
                        <linearGradient id="hexFillGradient" x1="0%" y1="100%" x2="0%" y2="0%">
                            <stop offset="0%" stopColor="oklch(0.52 0.23 25)" />
                            <stop offset="100%" stopColor="oklch(0.62 0.235 25)" />
                        </linearGradient>

                        {/* Hexagon clip path for the fill animation */}
                        <clipPath id="hexClip">
                            <polygon points="50,0 100,25 100,62 50,87 0,62 0,25" />
                        </clipPath>
                    </defs>

                    {/* Base hexagon shape */}
                    <polygon
                        points="50,0 100,25 100,62 50,87 0,62 0,25"
                        fill={isInstalled ? 'url(#hexGradient)' : 'url(#hexGradientGhost)'}
                        stroke={isInstalled ? 'none' : 'oklch(0.98 0.003 25 / 0.3)'}
                        strokeWidth={isInstalled ? 0 : 2}
                    />

                    {/* Animated fill layer for uninstalled games */}
                    {!isInstalled && (
                        <g clipPath="url(#hexClip)">
                            <rect
                                x="0"
                                y="87"
                                width="100"
                                height="87"
                                fill="url(#hexFillGradient)"
                                className="transition-transform duration-500 ease-out group-hover/hex:-translate-y-full"
                            />
                        </g>
                    )}

                    {/* Border overlay for uninstalled - stays on top */}
                    {!isInstalled && (
                        <polygon
                            points="50,0 100,25 100,62 50,87 0,62 0,25"
                            fill="none"
                            stroke="oklch(0.98 0.003 25 / 0.3)"
                            strokeWidth="2"
                            className="transition-all duration-500 group-hover/hex:stroke-white/50"
                        />
                    )}
                </svg>

                {/* Icon */}
                <div className="relative z-10">
                    {isInstalled ? (
                        <Play className="w-6 h-6 text-white fill-white ml-0.5 drop-shadow-lg" />
                    ) : (
                        <Download className="w-5 h-5 text-white drop-shadow-lg transition-transform duration-300 group-hover/hex:scale-110" />
                    )}
                </div>
            </button>
        </div>
    )
}
