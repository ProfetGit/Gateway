// ═══════════════════════════════════════════════════════════
// Library write lock
// ═══════════════════════════════════════════════════════════
//
// Every sync (Steam, Heroic, Lutris, clear-and-resync) is a long read-modify
// -write over the same games array, and the UI lets you start more than one:
// hit Refresh in Settings, then Import in Sources, and they interleave.
//
// store.updateGames() makes each individual write atomic, which stops rows
// being erased. This serializes whole *operations*, so a scan that decides
// "these are all the Heroic games" can't have that conclusion invalidated
// halfway through by another sync.
//
// Deliberately a queue rather than a "reject if busy": a user clicking Import
// during a refresh means it, and should not have to notice the collision.

let tail: Promise<unknown> = Promise.resolve()

export function withLibraryLock<T>(label: string, task: () => Promise<T>): Promise<T> {
    const run = tail.then(async () => {
        const startedAt = Date.now()
        try {
            return await task()
        } finally {
            console.log(`[Library] ${label} finished in ${Date.now() - startedAt}ms`)
        }
    })

    // Keep the chain alive even if this task rejects, so one failure doesn't
    // wedge every later sync.
    tail = run.catch(() => undefined)
    return run
}
