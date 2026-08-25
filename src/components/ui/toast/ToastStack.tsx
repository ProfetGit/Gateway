import { AnimatePresence } from 'framer-motion'
import { useToastStore } from './toast-store'
import { ToastItem } from './ToastItem'

/**
 * Mounts at the AppShell root, above every overlay (GameDetail is z-50, the
 * Steam match modal z-60). The container ignores pointer events so it never
 * blocks the UI underneath; individual toasts re-enable them.
 */
export function ToastStack() {
    const toasts = useToastStore((s) => s.toasts)

    return (
        <div className="fixed bottom-6 right-6 z-[70] flex flex-col-reverse gap-3 pointer-events-none">
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <ToastItem key={toast.id} toast={toast} />
                ))}
            </AnimatePresence>
        </div>
    )
}
