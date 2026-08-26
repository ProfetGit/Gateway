/// <reference types="vite/client" />

/** package.json version, injected by vite.config.ts at build time. */
declare const __APP_VERSION__: string

interface ElectronBridge {
  invoke: (cmd: string, args?: unknown) => Promise<unknown>
  listen: (event: string, cb: (payload: unknown) => void) => () => void
}

interface Window {
  electronBridge: ElectronBridge
}
