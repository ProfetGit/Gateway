import { create } from 'zustand'

export type ToastVariant = 'info' | 'celebration' | 'milestone' | 'problem'

export interface ToastAction {
    label: string
    onClick: () => void
}

export interface Toast {
    id: string
    variant: ToastVariant
    title: string
    message?: string
    /** Achievement icon, shown in the leading tile. */
    iconUrl?: string
    action?: ToastAction
    durationMs: number
}

export type ToastInput = Omit<Toast, 'id' | 'durationMs'> & { durationMs?: number }

// Cap the visible stack so a burst of unlocks can't tower up the screen.
const MAX_VISIBLE = 3

const DEFAULT_DURATION: Record<ToastVariant, number> = {
    info: 4000,
    celebration: 5000,
    milestone: 6000,
    // Problems carry an instruction ("install the umu-launcher package"), so
    // they need long enough to actually read.
    problem: 8000,
}

interface ToastState {
    toasts: Toast[]
    push: (toast: ToastInput) => string
    dismiss: (id: string) => void
    clear: () => void
}

const timers = new Map<string, ReturnType<typeof setTimeout>>()

function clearTimer(id: string) {
    const timer = timers.get(id)
    if (timer) {
        clearTimeout(timer)
        timers.delete(id)
    }
}

export const useToastStore = create<ToastState>((set, get) => ({
    toasts: [],

    push: (input) => {
        const id = `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
        const toast: Toast = {
            ...input,
            id,
            durationMs: input.durationMs ?? DEFAULT_DURATION[input.variant],
        }

        set((state) => {
            const next = [...state.toasts, toast]
            // Drop the oldest beyond the cap, cancelling their timers.
            const overflow = next.slice(0, Math.max(0, next.length - MAX_VISIBLE))
            overflow.forEach((t) => clearTimer(t.id))
            return { toasts: next.slice(-MAX_VISIBLE) }
        })

        timers.set(id, setTimeout(() => get().dismiss(id), toast.durationMs))
        return id
    },

    dismiss: (id) => {
        clearTimer(id)
        set((state) => ({ toasts: state.toasts.filter((t) => t.id !== id) }))
    },

    clear: () => {
        get().toasts.forEach((t) => clearTimer(t.id))
        set({ toasts: [] })
    },
}))
