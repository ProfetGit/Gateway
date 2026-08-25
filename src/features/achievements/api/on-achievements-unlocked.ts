import { listen, type UnlistenFn } from '@/lib/tauri-client'

export interface AchievementsUnlockedEvent {
  gameId: string
  gameTitle: string
  unlocked: Array<{ apiname: string; unlockTime: number }>
  totalUnlocked: number
}

export const onAchievementsUnlocked = (
  cb: (data: AchievementsUnlockedEvent) => void,
): Promise<UnlistenFn> =>
  listen<AchievementsUnlockedEvent>('achievements-unlocked', (event) => cb(event.payload))
