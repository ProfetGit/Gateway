import { useCountUp } from '@/components/ui/use-count-up'
import { COUNT_DELAY_MS, COUNT_MS } from './game-detail-animations'

/** The two numbers worth watching land. Everything else is a static label. */
export function GameDetailRailStats({
    playtimeHours, completion, hasAchievements,
}: { playtimeHours: number; completion: number; hasAchievements: boolean }) {
    const hours = Math.round(useCountUp(playtimeHours, COUNT_MS, COUNT_DELAY_MS))
    const pct = Math.round(useCountUp(completion, COUNT_MS, COUNT_DELAY_MS + 80))

    return (
        <div className="flex gap-5">
            <div>
                <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32">Playtime</p>
                <p className="mt-0.5 font-display font-black italic text-2xl leading-[0.9] tracking-[-0.02em] text-white">
                    {hours}<span className="text-sm text-crimson-500">h</span>
                </p>
            </div>
            {hasAchievements && (
                <div>
                    <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32">Complete</p>
                    <p className="mt-0.5 font-display font-black italic text-2xl leading-[0.9] tracking-[-0.02em] text-white">
                        {pct}<span className="text-sm text-crimson-500">%</span>
                    </p>
                </div>
            )}
        </div>
    )
}
