import { listen, type UnlistenFn } from '@/lib/tauri-client'

export const onGameClaimed = (
  cb: (data: { appId: string; owned: boolean }) => void
): Promise<UnlistenFn> =>
  listen<{ appId: string; owned: boolean }>('game-claimed', (event) => cb(event.payload))
