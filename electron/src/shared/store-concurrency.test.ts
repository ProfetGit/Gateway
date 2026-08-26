import { describe, it, expect, beforeEach } from 'vitest'
import type { Game } from './types'

// ═══════════════════════════════════════════════════════════
// Stale-snapshot regressions
// ═══════════════════════════════════════════════════════════
//
// The reported bug: import Heroic games, hit Refresh Library, and every Heroic
// game vanishes. Cause was not the Heroic sync at all — it was mirrorAllCovers
// snapshotting the games array, spending minutes downloading covers, then
// writing that stale snapshot back over everything imported since.
//
// JsonStore itself needs Electron's app.getPath, so this exercises the same
// read-modify-write semantics against a minimal stand-in.

class FakeStore {
    private games: Game[] = []

    get(): Game[] {
        return [...this.games]
    }

    set(games: Game[]): void {
        this.games = games
    }

    updateGames(mutate: (games: Game[]) => Game[]): Game[] {
        const next = mutate([...this.games])
        this.games = next
        return next
    }
}

function game(id: string, source: Game['source'], extra: Partial<Game> = {}): Game {
    return { id, title: id, isInstalled: false, isFavorite: false, source, ...extra }
}

let store: FakeStore
beforeEach(() => {
    store = new FakeStore()
})

describe('stale snapshot clobbering', () => {
    it('reproduces the old bug: writing a snapshot back erases later imports', () => {
        store.set([game('steam-1', 'steam')])

        // The old mirrorAllCovers shape: snapshot, do slow work, write it back.
        const snapshot = store.get()

        // A Heroic import lands during that slow work.
        store.set([...store.get(), game('heroic-1', 'heroic')])

        // Old behaviour — this is what deleted the user's Heroic library.
        store.set(snapshot)
        expect(store.get().map((g) => g.id)).toEqual(['steam-1'])
    })

    it('patch-by-id against a fresh read preserves the concurrent import', () => {
        store.set([game('steam-1', 'steam', { coverUrl: 'https://cdn/a.jpg' })])

        // Snapshot only to decide what work to do.
        const toMirror = store.get().filter((g) => g.coverUrl && !g.localCoverPath)

        // Heroic import lands mid-download.
        store.set([...store.get(), game('heroic-1', 'heroic')])

        // New behaviour: apply results by id to whatever exists now.
        const mirrored = new Map(toMirror.map((g) => [g.id, `${g.id}.jpg`]))
        store.updateGames((games) =>
            games.map((g) => {
                const fileName = mirrored.get(g.id)
                return fileName && !g.localCoverPath ? { ...g, localCoverPath: fileName } : g
            })
        )

        const result = store.get()
        expect(result.map((g) => g.id).sort()).toEqual(['heroic-1', 'steam-1'])
        expect(result.find((g) => g.id === 'steam-1')!.localCoverPath).toBe('steam-1.jpg')
    })

    it('drops patches for rows deleted while the slow work ran', () => {
        store.set([game('steam-1', 'steam', { coverUrl: 'https://cdn/a.jpg' })])
        const mirrored = new Map([['steam-1', 'steam-1.jpg']])

        store.set([]) // user cleared the library mid-download

        store.updateGames((games) =>
            games.map((g) => {
                const fileName = mirrored.get(g.id)
                return fileName ? { ...g, localCoverPath: fileName } : g
            })
        )
        // The deleted row must not be resurrected.
        expect(store.get()).toEqual([])
    })

    it('does not overwrite a cover that arrived by another route meanwhile', () => {
        store.set([game('steam-1', 'steam', { coverUrl: 'https://cdn/a.jpg' })])
        const mirrored = new Map([['steam-1', 'from-mirror.jpg']])

        store.updateGames((games) =>
            games.map((g) => ({ ...g, localCoverPath: 'from-import.jpg' }))
        )

        store.updateGames((games) =>
            games.map((g) => {
                const fileName = mirrored.get(g.id)
                return fileName && !g.localCoverPath ? { ...g, localCoverPath: fileName } : g
            })
        )

        expect(store.get()[0]!.localCoverPath).toBe('from-import.jpg')
    })

    it('get() hands back a copy, so mutating it cannot reshape stored state', () => {
        store.set([game('steam-1', 'steam')])
        const borrowed = store.get()
        borrowed.push(game('ghost', 'manual'))
        borrowed.length = 0

        expect(store.get().map((g) => g.id)).toEqual(['steam-1'])
    })

    it('sequential updateGames calls compose instead of overwriting', () => {
        store.set([game('a', 'steam'), game('b', 'steam')])

        store.updateGames((games) => games.map((g) => (g.id === 'a' ? { ...g, title: 'A!' } : g)))
        store.updateGames((games) => games.map((g) => (g.id === 'b' ? { ...g, title: 'B!' } : g)))

        expect(store.get().map((g) => g.title)).toEqual(['A!', 'B!'])
    })
})
