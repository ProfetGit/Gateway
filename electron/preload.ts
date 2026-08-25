import { ipcRenderer, contextBridge, type IpcRendererEvent } from 'electron'

// ═══════════════════════════════════════════════════════════
// electronBridge — generic invoke/listen surface
// ═══════════════════════════════════════════════════════════
//
// The renderer's IPC seam (src/lib/tauri-client.ts) talks to this bridge
// instead of Tauri's @tauri-apps/api. Every command name here is the exact
// snake_case channel string the renderer's api/*.ts wrapper files already
// call via invoke('command_name', args) — see electron/main.ts and
// electron/src/features/*/*-ipc.ts for the handler registrations.
contextBridge.exposeInMainWorld('electronBridge', {
  invoke: (cmd: string, args?: unknown) => ipcRenderer.invoke(cmd, args),
  listen: (event: string, cb: (payload: unknown) => void) => {
    const sub = (_e: IpcRendererEvent, payload: unknown) => cb(payload)
    ipcRenderer.on(event, sub)
    return () => ipcRenderer.removeListener(event, sub)
  },
})
