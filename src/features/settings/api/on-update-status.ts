import { listen } from '@/lib/tauri-client'
import { UpdateStatusSchema, type UpdateStatus } from './update-schema'

export const onUpdateStatus = (cb: (status: UpdateStatus) => void) =>
  listen<unknown>('update-status', (event) => {
    // Parsed, not cast — a bad state would otherwise match no branch at all.
    const parsed = UpdateStatusSchema.safeParse(event.payload)
    if (parsed.success) cb(parsed.data)
    else console.warn('Ignoring malformed update status:', parsed.error)
  })
