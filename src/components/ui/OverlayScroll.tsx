import type { ReactNode } from 'react'
import { useOverlayScrollbar } from './use-overlay-scrollbar'

export type OverlayScrollProps = {
    children: ReactNode
    /** Classes for the scrolling element itself. */
    className?: string
    /** Classes for the positioned wrapper. */
    outerClassName?: string
    onScroll?: React.UIEventHandler<HTMLDivElement>
}

/**
 * A scroll region whose bar is drawn ON the content rather than beside it, so
 * full-bleed artwork runs edge to edge underneath it. The native bar is hidden;
 * everything visible here is a real element, which is what allows the fade and
 * the width change to actually animate.
 */
export function OverlayScroll({ children, className = '', outerClassName = '', onScroll }: OverlayScrollProps) {
    const { scrollRef, thumb, flash, thumbHandlers } = useOverlayScrollbar<HTMLDivElement>()

    return (
        <div
            className={`relative ${outerClassName}`}
            onPointerEnter={flash}
            onPointerMove={thumb.dragging ? undefined : flash}
        >
            <div
                ref={scrollRef}
                onScroll={onScroll}
                className={`h-full w-full overflow-y-auto overflow-x-hidden [scrollbar-width:none] [&::-webkit-scrollbar]:hidden ${className}`}
            >
                {children}
            </div>

            {thumb.scrollable && (
                <div
                    {...thumbHandlers}
                    role="presentation"
                    style={{ height: thumb.height, transform: `translateY(${thumb.top}px)` }}
                    className={`group/thumb absolute right-[5px] top-0 z-40 w-[6px] cursor-grab touch-none transition-[opacity,width] duration-150 ease-out-expo hover:w-[9px] hover:right-[3px] ${
                        thumb.visible ? 'opacity-100' : 'opacity-0'
                    } ${thumb.dragging ? 'w-[9px] right-[3px] cursor-grabbing' : ''}`}
                >
                    <span
                        className={`block h-full w-full transition-colors duration-100 ease-out-expo ${
                            thumb.dragging
                                ? 'bg-crimson-500 shadow-[0_0_14px_oklch(0.58_0.245_25/0.7)]'
                                : 'bg-white/22 group-hover/thumb:bg-crimson-600 group-hover/thumb:shadow-[0_0_10px_oklch(0.58_0.245_25/0.5)]'
                        }`}
                    />
                </div>
            )}
        </div>
    )
}
