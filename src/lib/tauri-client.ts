// IPC seam — every domain's api/*.ts wrapper imports invoke/listen from
// here, never from the Electron bridge directly. This file used to
// re-export from @tauri-apps/api; it now delegates to window.electronBridge
// (exposed by electron/preload.ts), keeping the exact same call signatures
// so no caller needed to change.

export type UnlistenFn = () => void

export function invoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  return window.electronBridge.invoke(cmd, args) as Promise<T>
}

export function listen<T>(
  event: string,
  cb: (event: { payload: T }) => void
): Promise<UnlistenFn> {
  const unlisten = window.electronBridge.listen(event, (payload) => cb({ payload: payload as T }))
  return Promise.resolve(unlisten)
}
