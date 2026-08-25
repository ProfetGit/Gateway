import { ipcMain, Notification, BrowserWindow } from 'electron'

interface DesktopNotificationInput {
    title: string
    body: string
    /** When true the notification is sent even if the window has focus. */
    force?: boolean
}

export function setupNotificationHandlers(getMainWindow: () => BrowserWindow | null) {
    ipcMain.handle('show_desktop_notification', (_event, { title, body, force }: DesktopNotificationInput) => {
        if (!Notification.isSupported()) {
            return { shown: false, reason: 'unsupported' }
        }

        // The in-app toast already covers a focused window — sending both would
        // report the same unlock twice.
        if (!force && getMainWindow()?.isFocused()) {
            return { shown: false, reason: 'window-focused' }
        }

        try {
            new Notification({ title, body, urgency: 'normal' }).show()
            return { shown: true }
        } catch (error) {
            console.error('[Main] Failed to show desktop notification:', error)
            return { shown: false, reason: 'error' }
        }
    })
}
