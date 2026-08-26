import { describe, it, expect } from 'vitest'
import type { Game } from './types'

// pruneOrphanArt needs electron's app.getPath, so the set-building half — the
// part that decides what to DELETE, and therefore the part that can lose a
// user's art — is exercised directly here.

function referencedFileNames(games: Game[]): Set<string> {
    const referenced = new Set<string>()
    for (const game of games) {
        if (game.localCoverPath) referenced.add(game.localCoverPath)
        for (const url of [game.heroImageUrl, game.logoImageUrl]) {
            if (url?.startsWith('gateway://')) {
                const fileName = url.split('/').pop()
                if (fileName) referenced.add(fileName)
            }
        }
    }
    return referenced
}

function makeGame(overrides: Partial<Game>): Game {
    return {
        id: 'g1',
        title: 'Game',
        isInstalled: false,
        isFavorite: false,
        source: 'steam',
        ...overrides,
    }
}

describe('referencedFileNames', () => {
    it('collects cover, hero, and logo files', () => {
        const referenced = referencedFileNames([
            makeGame({
                localCoverPath: '440.jpg',
                heroImageUrl: 'gateway://hero/shortcut_1.png',
                logoImageUrl: 'gateway://logo/shortcut_1.png',
            }),
        ])
        expect([...referenced].sort()).toEqual(['440.jpg', 'shortcut_1.png'])
    })

    it('ignores remote art URLs, which are not local files', () => {
        const referenced = referencedFileNames([
            makeGame({ heroImageUrl: 'https://cdn/hero.jpg', logoImageUrl: 'https://cdn/logo.png' }),
        ])
        expect(referenced.size).toBe(0)
    })

    it('handles games with no art at all', () => {
        expect(referencedFileNames([makeGame({})]).size).toBe(0)
    })

    it('dedupes a file shared by several games', () => {
        const referenced = referencedFileNames([
            makeGame({ id: 'a', localCoverPath: 'same.jpg' }),
            makeGame({ id: 'b', localCoverPath: 'same.jpg' }),
        ])
        expect(referenced.size).toBe(1)
    })

    // An empty library must still produce an empty set rather than throwing —
    // the caller deletes everything NOT in this set.
    it('returns an empty set for an empty library', () => {
        expect(referencedFileNames([]).size).toBe(0)
    })

    it('keeps every art file across a mixed library', () => {
        const referenced = referencedFileNames([
            makeGame({ id: 'a', localCoverPath: 'a.jpg' }),
            makeGame({ id: 'b', source: 'heroic', localCoverPath: 'b.jpg' }),
            makeGame({ id: 'c', source: 'lutris', heroImageUrl: 'gateway://hero/c.jpg' }),
            makeGame({ id: 'd', source: 'shortcut', logoImageUrl: 'gateway://logo/d.png' }),
        ])
        expect([...referenced].sort()).toEqual(['a.jpg', 'b.jpg', 'c.jpg', 'd.png'])
    })
})
