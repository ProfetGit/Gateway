import { GameDetailBand, SkeletonLines } from './GameDetailBand'
import { parseRequirements } from './parse-requirements'

const BAND_INDEX = 3

function SpecColumn({ heading, html }: { heading: string; html: string | undefined }) {
    const rows = parseRequirements(html)
    if (rows.length === 0) return null

    return (
        <div className="[&+&]:pl-7 [&+&]:border-l [&+&]:border-void-border/45">
            <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/45">{heading}</p>
            <dl className="mt-2 grid grid-cols-[auto_1fr] gap-x-3.5 gap-y-1">
                {rows.map((row) => (
                    <div key={row.label} className="contents">
                        <dt className="pt-0.5 text-[8.5px] font-mono font-bold uppercase tracking-[0.16em] text-white/28">
                            {row.label}
                        </dt>
                        <dd className="m-0 text-[11.5px] leading-snug text-white/60 truncate" title={row.value}>
                            {row.value}
                        </dd>
                    </div>
                ))}
            </dl>
        </div>
    )
}

/**
 * Auto-hides when Steam gave us nothing, which is every Heroic, Lutris and
 * manually added game — same rule the home sections follow. Deliberately the
 * quietest band on the panel: reference material, not a reason to be here.
 */
export function GameDetailRequirements({
    minimum, recommended, isLoading, compact = false,
}: { minimum: string | undefined; recommended: string | undefined; isLoading: boolean; compact?: boolean }) {
    const hasAny = parseRequirements(minimum).length > 0 || parseRequirements(recommended).length > 0
    if (!isLoading && !hasAny) return null

    return (
        <GameDetailBand index={BAND_INDEX} compact={compact} title="System requirements" aside={
            <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/25">Linux</span>
        }>
            {isLoading && !hasAny ? (
                <div className="grid grid-cols-2 gap-7">
                    <SkeletonLines count={4} />
                    <SkeletonLines count={4} />
                </div>
            ) : (
                <div className="grid grid-cols-2 gap-7">
                    <SpecColumn heading="Minimum" html={minimum} />
                    <SpecColumn heading="Recommended" html={recommended} />
                </div>
            )}
        </GameDetailBand>
    )
}
