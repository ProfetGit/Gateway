import { describe, it, expect } from 'vitest'
import { coverSources, nextCoverSource } from './game-cover-src'
import { makeGame } from './game-test-fixtures'

describe('coverSources', () => {
    it('prefers the mirrored cover, then the remote URL, then Steam guesses', () => {
        const game = makeGame({
            id: '1', title: 'Hades',
            localCoverPath: 'abc.jpg',
            coverUrl: 'https://example.test/cover.jpg',
            steamAppId: '620',
        })

        expect(coverSources(game)).toEqual([
            'gateway://thumb/abc.jpg',
            'https://example.test/cover.jpg',
            'https://steamcdn-a.akamaihd.net/steam/apps/620/library_600x900_2x.jpg',
            'https://steamcdn-a.akamaihd.net/steam/apps/620/library_600x900.jpg',
            'https://steamcdn-a.akamaihd.net/steam/apps/620/header.jpg',
        ])
    })

    it('uses metadataAppId when the game is not owned on Steam', () => {
        const game = makeGame({ id: '1', title: 'How to Fish', metadataAppId: '4001890' })
        expect(coverSources(game)[0]).toContain('/4001890/library_600x900_2x.jpg')
    })

    it('is empty when there is nothing to render', () => {
        expect(coverSources(makeGame({ id: '1', title: 'Nameless' }))).toEqual([])
    })
})

describe('nextCoverSource', () => {
    const game = makeGame({ id: '1', title: 'Portal 2', localCoverPath: 'abc.jpg', steamAppId: '620' })

    it('advances to the next candidate', () => {
        expect(nextCoverSource(game, 'gateway://thumb/abc.jpg'))
            .toBe('https://steamcdn-a.akamaihd.net/steam/apps/620/library_600x900_2x.jpg')
    })

    it('returns undefined once the chain is exhausted', () => {
        expect(nextCoverSource(game, 'https://steamcdn-a.akamaihd.net/steam/apps/620/header.jpg')).toBeUndefined()
    })

    it('returns undefined for a source that is not in the chain', () => {
        expect(nextCoverSource(game, 'https://elsewhere.test/x.jpg')).toBeUndefined()
    })
})
