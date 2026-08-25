import { useToastStore } from '@/components/ui/toast/toast-store'
import { showDesktopNotification } from '@/lib/api/desktop-notification'

interface UnlockNotification {
    achievementName: string
    gameTitle: string
    iconUrl?: string
    /** Called if the user hits Undo on the toast. Omit to hide the action. */
    onUndo?: () => void
}

interface CompletionNotification {
    gameTitle: string
    total: number
}

/**
 * One unlock: in-app toast always, plus a desktop notification when the window
 * is in the background (the main process makes that call, not us).
 */
export function notifyAchievementUnlock({ achievementName, gameTitle, iconUrl, onUndo }: UnlockNotification) {
    useToastStore.getState().push({
        variant: 'celebration',
        title: achievementName,
        message: gameTitle,
        iconUrl,
        action: onUndo ? { label: 'Undo', onClick: onUndo } : undefined,
    })

    void showDesktopNotification(`Achievement unlocked — ${gameTitle}`, achievementName)
        .catch((err) => console.error('Desktop notification failed:', err))
}

/**
 * A backlog catching up in one pass — e.g. tracking was enabled after already
 * being deep into a game, so the emulator grants a batch of already-earned
 * achievements at once. One toast instead of one per achievement.
 */
export function notifyAchievementBurst(gameTitle: string, count: number) {
    useToastStore.getState().push({
        variant: 'celebration',
        title: `${count} achievements unlocked`,
        message: gameTitle,
    })

    void showDesktopNotification(gameTitle, `${count} achievements unlocked at once`)
        .catch((err) => console.error('Desktop notification failed:', err))
}

/**
 * The bigger moment. Always reaches the desktop too, focused or not — finishing
 * a game is worth interrupting for.
 */
export function notifyGameCompleted({ gameTitle, total }: CompletionNotification) {
    useToastStore.getState().push({
        variant: 'milestone',
        title: gameTitle,
        message: `All ${total} achievements unlocked.`,
    })

    void showDesktopNotification('100% complete', `${gameTitle} — all ${total} achievements unlocked.`, { force: true })
        .catch((err) => console.error('Desktop notification failed:', err))
}
