import { useToastStore } from '@/components/ui/toast/toast-store'
import { launchGame } from './api/launch-game'
import type { Game } from './game-library-types'

/**
 * Launch a game and say so when it doesn't start.
 *
 * Every Play button in the app goes through here. The raw launchGame wrapper
 * returns { success, error } that all four call sites used to throw away — a
 * missing Proton build or a stale executable path was a click that did
 * nothing at all, with the reason only in the main-process console.
 */
export async function launchGameWithFeedback(game: Game): Promise<void> {
    let error: string | undefined

    try {
        const result = await launchGame(game)
        if (result.success) return
        error = result.error
    } catch (e) {
        console.error('Failed to launch game:', e)
        error = e instanceof Error ? e.message : undefined
    }

    useToastStore.getState().push({
        variant: 'problem',
        title: `Couldn't start ${game.title}`,
        message: error ?? 'Check the game file path in Properties.',
    })
}
