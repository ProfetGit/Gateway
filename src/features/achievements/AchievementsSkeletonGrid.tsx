/**
 * Shimmer placeholders shaped like the real tiles — same 44px icon, same three
 * text lines — so the grid does not reflow when data lands.
 */
export function AchievementsSkeletonGrid({ count = 8 }: { count?: number }) {
    return (
        <>
            {Array.from({ length: count }).map((_, i) => (
                <div
                    key={i}
                    className="flex gap-3 p-3 bg-void-deep border border-void-border/40"
                    style={{ animation: `fadeSlideIn 0.4s ease-out ${i * 0.04}s backwards` }}
                >
                    <div className="w-11 h-11 shrink-0 skeleton-block" />
                    <div className="min-w-0 flex-1 space-y-2 py-0.5">
                        <div className="h-3 w-1/2 skeleton-block" />
                        <div className="h-2.5 w-full skeleton-block" />
                        <div className="h-[2px] w-full skeleton-block" />
                    </div>
                </div>
            ))}
        </>
    )
}
