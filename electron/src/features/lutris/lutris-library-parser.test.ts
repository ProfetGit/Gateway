import { describe, it, expect } from 'vitest'
import {
    extractJsonArray,
    parseLutrisGames,
    parseLutrisTimestamp,
    resolveLutrisSteamAppId,
    toGameFields,
} from './lutris-library-parser'
import type { LutrisCliGame } from './lutris-types'

function makeRow(overrides: Partial<LutrisCliGame> = {}): LutrisCliGame {
    return {
        id: 1,
        slug: 'hades',
        name: 'Hades',
        runner: 'wine',
        platform: 'Linux',
        directory: '/games/hades',
        playtimeSeconds: null,
        lastplayed: null,
        coverPath: null,
        ...overrides,
    }
}

describe('extractJsonArray', () => {
    it('parses a clean array', () => {
        expect(extractJsonArray('[{"id":1}]')).toEqual([{ id: 1 }])
    })

    // Lutris logs to stderr, but it boots a full GTK app — be defensive.
    it('slices the array out of surrounding log noise', () => {
        expect(extractJsonArray('INFO booting\n[{"id":1}]\nINFO done')).toEqual([{ id: 1 }])
    })

    it('handles the empty-library case', () => {
        expect(extractJsonArray('[]')).toEqual([])
    })

    it.each([['', 'empty string'], ['no brackets here', 'no array'], ['[{bad json}]', 'malformed']])(
        'returns [] for %s',
        (input) => {
            expect(extractJsonArray(input)).toEqual([])
        }
    )

    it('returns [] when the payload is an object, not an array', () => {
        expect(extractJsonArray('{"nope":1}')).toEqual([])
    })
})

describe('parseLutrisGames', () => {
    it('reads a well-formed row', () => {
        const games = parseLutrisGames([makeRow({ playtimeSeconds: 5400 })])
        expect(games[0]).toMatchObject({ id: 1, slug: 'hades', name: 'Hades', playtimeSeconds: 5400 })
    })

    // playtime is a Python timedelta string. Number("1:30:00") is NaN.
    it('ignores the playtime timedelta string entirely', () => {
        const games = parseLutrisGames([
            { ...makeRow(), playtime: '1:30:00', playtimeSeconds: 5400 },
        ])
        expect(games[0]!.playtimeSeconds).toBe(5400)
        expect(games[0]).not.toHaveProperty('playtime')
    })

    it('nulls a non-numeric playtimeSeconds rather than propagating NaN', () => {
        const games = parseLutrisGames([{ ...makeRow(), playtimeSeconds: '1:30:00' }])
        expect(games[0]!.playtimeSeconds).toBeNull()
    })

    it.each([
        [{ slug: 'x', name: 'X' }, 'no id'],
        [{ id: 1, name: 'X' }, 'no slug'],
        [{ id: 1, slug: 'x' }, 'no name'],
    ])('skips a row with %s', (row) => {
        expect(parseLutrisGames([row])).toEqual([])
    })

    it.each([[[null]], [['string']], [[42]], [[[]]]])('skips non-object rows %#', (raw) => {
        expect(parseLutrisGames(raw)).toEqual([])
    })
})

describe('parseLutrisTimestamp', () => {
    // Lutris emits str(datetime.fromtimestamp(...)) — LOCAL time, no zone.
    // Treating it as UTC would be wrong by the machine's offset and would
    // silently misorder the "last played" sort.
    it('interprets the timestamp as local time, not UTC', () => {
        const iso = parseLutrisTimestamp('2026-08-25 21:33:15')!
        const parsed = new Date(iso)
        expect(parsed.getFullYear()).toBe(2026)
        expect(parsed.getMonth()).toBe(7) // August
        expect(parsed.getDate()).toBe(25)
        expect(parsed.getHours()).toBe(21)
        expect(parsed.getMinutes()).toBe(33)
        expect(parsed.getSeconds()).toBe(15)
    })

    it('does not simply append Z', () => {
        const iso = parseLutrisTimestamp('2026-08-25 21:33:15')!
        expect(iso).not.toBe('2026-08-25T21:33:15Z')
        expect(iso).toBe(new Date('2026-08-25T21:33:15').toISOString())
    })

    it.each([[null], ['']])('returns undefined for %p', (input) => {
        expect(parseLutrisTimestamp(input)).toBeUndefined()
    })

    it('returns undefined for an unparseable string', () => {
        expect(parseLutrisTimestamp('not a date')).toBeUndefined()
    })
})

describe('resolveLutrisSteamAppId', () => {
    it('extracts the appid from a steam- slug', () => {
        expect(resolveLutrisSteamAppId('steam-440')).toBe('440')
    })

    // Guards the ^steam-(\d+)$ anchor against a naive startsWith.
    it('returns null for a slug that merely starts with steam-', () => {
        expect(resolveLutrisSteamAppId('steam-punk-adventure')).toBeNull()
    })

    it.each([['hades'], ['steam-'], ['440'], ['xsteam-440'], ['steam-440-dlc']])(
        'returns null for %p',
        (slug) => {
            expect(resolveLutrisSteamAppId(slug)).toBeNull()
        }
    )
})

describe('toGameFields', () => {
    it('converts playtime seconds to whole minutes', () => {
        expect(toGameFields(makeRow({ playtimeSeconds: 5400 }), true)).toMatchObject({ playtime: 90 })
    })

    it('rounds rather than truncating', () => {
        expect(toGameFields(makeRow({ playtimeSeconds: 100 }), true)).toMatchObject({ playtime: 2 })
    })

    it('omits playtime when the CLI reports null', () => {
        expect(toGameFields(makeRow(), true)).not.toHaveProperty('playtime')
    })

    it('omits lastPlayed when the CLI reports null', () => {
        expect(toGameFields(makeRow(), true)).not.toHaveProperty('lastPlayed')
    })

    it('carries lutris identity and source', () => {
        expect(toGameFields(makeRow({ id: 7, slug: 'celeste' }), false)).toMatchObject({
            source: 'lutris',
            lutrisId: 7,
            lutrisSlug: 'celeste',
            isInstalled: false,
        })
    })
})
