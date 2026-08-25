/// <reference types="vite/client" />

interface ElectronBridge {
  invoke: (cmd: string, args?: unknown) => Promise<unknown>
  listen: (event: string, cb: (payload: unknown) => void) => () => void
}

interface Window {
  electronBridge: ElectronBridge
}
