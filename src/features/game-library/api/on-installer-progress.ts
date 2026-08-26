import { listen, type UnlistenFn } from '@/lib/tauri-client'
import { InstallerProgressSchema, type InstallerProgress } from './launch-schema'

export const onInstallerProgress = (
  cb: (progress: InstallerProgress) => void
): Promise<UnlistenFn> =>
  listen<unknown>('installer-progress', (event) => {
    const parsed = InstallerProgressSchema.safeParse(event.payload)
    // A malformed payload must not throw out of the listener — that would
    // leave the wizard stuck on its last message with no way forward.
    if (parsed.success) cb(parsed.data)
    else console.error('Ignoring malformed installer progress:', parsed.error.issues)
  })
