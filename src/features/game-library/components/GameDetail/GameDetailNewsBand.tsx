import { motion } from 'framer-motion'
import type { NewsItem } from '../../game-news-types'
import { GameDetailBand } from './GameDetailBand'
import { rowVariants } from './game-detail-animations'

import { newsExcerpt } from './parse-steam-news'

const BAND_INDEX = 2

/** Six columns is already more sideways travel than anyone will use, and the
 *  band is a pointer into the feed, not the feed itself. */
const MAX_ITEMS = 6

function formatDate(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
        day: 'numeric', month: 'short', year: 'numeric',
    })
}

/**
 * Horizontal, because news is the one thing here with no natural end. Columns
 * divided by hairlines rather than boxed cards — the panel is one surface.
 * The scrollbar is masked away; the fade at the right edge is the affordance.
 */
export function GameDetailNewsBand({
    news, isLoading, compact = false, onSelect,
}: {
    news: NewsItem[]
    isLoading: boolean
    compact?: boolean
    onSelect: (item: NewsItem) => void
}) {
    if (!isLoading && news.length === 0) return null

    const items = news.slice(0, MAX_ITEMS)

    return (
        <GameDetailBand
            index={BAND_INDEX}
            compact={compact}
            title="News"
            aside={items.length > 1 && (
                <span className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/25">
                    Scroll sideways →
                </span>
            )}
        >
            <div
                className="flex overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                style={{
                    maskImage: 'linear-gradient(to right, black 88%, transparent)',
                    WebkitMaskImage: 'linear-gradient(to right, black 88%, transparent)',
                }}
            >
                {isLoading
                    ? Array.from({ length: 4 }).map((_, i) => (
                        <div key={i} className="w-[216px] shrink-0 px-[18px] first:pl-0 border-l border-void-border/45 first:border-l-0 space-y-2">
                            <div className="h-2.5 w-20 skeleton-block" />
                            <div className="h-3 w-full skeleton-block" />
                            <div className="h-2.5 w-2/3 skeleton-block" />
                        </div>
                    ))
                    : items.map((item, i) => (
                        <motion.button
                            key={item.gid}
                            variants={rowVariants(BAND_INDEX, i)}
                            onClick={() => onSelect(item)}
                            className="group w-[216px] shrink-0 px-[18px] first:pl-0 text-left border-l border-void-border/45 first:border-l-0"
                        >
                            <span className="block text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-white/32">
                                {formatDate(item.date)}
                            </span>
                            <span className="block mt-1.5 mb-1 text-[12.5px] font-bold leading-tight text-white line-clamp-2 group-hover:text-crimson-300 transition-colors duration-100 ease-out-expo">
                                {item.title}
                            </span>
                            <span className="block text-[11.5px] leading-snug text-white/45 line-clamp-2">
                                {newsExcerpt(item.contents)}
                            </span>
                        </motion.button>
                    ))}
            </div>
        </GameDetailBand>
    )
}
