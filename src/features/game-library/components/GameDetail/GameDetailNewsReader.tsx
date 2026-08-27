import { useEffect } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { ExternalLink, X } from 'lucide-react'
import { openUrl } from '@/lib/api/navigation'
import type { NewsItem } from '../../game-news-types'
import { newsToHtml } from './parse-steam-news'

function formatDate(unixSeconds: number): string {
    return new Date(unixSeconds * 1000).toLocaleDateString(undefined, {
        day: 'numeric', month: 'long', year: 'numeric',
    })
}

/**
 * Full announcement, read in place. Opening the browser for a patch note pulls
 * the user out of the app for two paragraphs of text, so that became the
 * secondary action rather than the only one.
 */
export function GameDetailNewsReader({ item, onClose }: { item: NewsItem | null; onClose: () => void }) {
    useEffect(() => {
        if (!item) return
        const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
        window.addEventListener('keydown', onKey)
        return () => window.removeEventListener('keydown', onKey)
    }, [item, onClose])

    return (
        <AnimatePresence>
            {item && (
                <>
                    <motion.div
                        className="fixed inset-0 z-[60] bg-void-pure/85 backdrop-blur-md"
                        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                        transition={{ duration: 0.18, ease: [0.16, 1, 0.3, 1] }}
                        onClick={onClose}
                    />
                    <motion.article
                        className="fixed inset-y-0 right-0 z-[61] w-full max-w-[760px] flex flex-col bg-void-pure border-l border-void-border shadow-void-float"
                        initial={{ x: '4%', opacity: 0 }}
                        animate={{ x: 0, opacity: 1 }}
                        exit={{ x: '3%', opacity: 0 }}
                        transition={{ duration: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    >
                        <header className="shrink-0 flex items-start gap-4 px-7 py-6 border-b border-void-border">
                            <div className="min-w-0 flex-1">
                                <p className="text-[9px] font-mono font-bold uppercase tracking-[0.2em] text-crimson-400">
                                    {formatDate(item.date)}{item.feedlabel ? ` · ${item.feedlabel}` : ''}
                                </p>
                                <h2 className="mt-2 text-xl font-display font-black italic uppercase tracking-tight text-white text-balance">
                                    {item.title}
                                </h2>
                            </div>
                            <button
                                onClick={onClose}
                                aria-label="Close"
                                className="shrink-0 p-2 text-white/35 hover:text-white hover:bg-crimson-600 border border-void-border/40 transition-colors duration-100 ease-out-expo"
                            >
                                <X className="w-4 h-4" />
                            </button>
                        </header>

                        <div className="flex-1 min-h-0 overflow-y-auto [scrollbar-gutter:stable] px-7 py-6">
                            <div
                                className="select-text news-body text-[13.5px] leading-relaxed text-white/70"
                                dangerouslySetInnerHTML={{ __html: newsToHtml(item.contents) }}
                            />
                        </div>

                        <footer className="shrink-0 px-7 py-4 border-t border-void-border">
                            <button
                                onClick={() => void openUrl(item.url)}
                                className="group flex items-center gap-2 text-[10px] font-mono font-bold uppercase tracking-[0.18em] text-white/45 hover:text-white border-b border-transparent hover:border-crimson-500 transition-[color,border-color] duration-100 ease-out-expo"
                            >
                                Open in browser
                                <ExternalLink className="w-3 h-3 transition-transform duration-100 ease-out-expo group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
                            </button>
                        </footer>
                    </motion.article>
                </>
            )}
        </AnimatePresence>
    )
}
