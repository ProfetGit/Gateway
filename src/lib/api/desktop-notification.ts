import { z } from 'zod'
import { invoke } from '@/lib/tauri-client'

const ShowDesktopNotificationResultSchema = z.object({
  shown: z.boolean(),
  reason: z.string().optional(),
})

/**
 * Sends a desktop notification. The main process skips it when the Gateway
 * window already has focus, so callers can fire this alongside an in-app toast
 * without the user seeing the same thing twice.
 */
export const showDesktopNotification = async (
  title: string,
  body: string,
  options?: { force?: boolean },
) => {
  const result = await invoke('show_desktop_notification', {
    title,
    body,
    force: options?.force ?? false,
  })
  return ShowDesktopNotificationResultSchema.parse(result)
}
