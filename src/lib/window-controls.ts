// Replacement for @tauri-apps/api/window's getCurrentWindow() — the only
// other renderer call site (besides tauri-client.ts) that touched the Tauri
// SDK directly. AppShell's titlebar buttons call this instead.

import { invoke } from './tauri-client'

export function getCurrentWindow() {
  return {
    minimize: () => invoke<void>('window_minimize'),
    toggleMaximize: () => invoke<void>('window_toggle_maximize'),
    close: () => invoke<void>('window_close'),
  }
}
