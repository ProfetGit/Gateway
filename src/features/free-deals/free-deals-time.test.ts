import { describe, it, expect } from 'vitest'
import { formatTimeRemaining } from './free-deals-time'

const NOW = new Date('2026-08-22T12:00:00.000Z')

describe('formatTimeRemaining', () => {
    it('shows days and hours when there is more than a day left', () => {
        expect(formatTimeRemaining('2026-08-25T15:00:00.000Z', NOW)).toBe('3d 3h')
    })

    it('shows hours inside the last day', () => {
        expect(formatTimeRemaining('2026-08-22T17:30:00.000Z', NOW)).toBe('5h left')
    })

    it('shows minutes inside the last hour', () => {
        expect(formatTimeRemaining('2026-08-22T12:20:00.000Z', NOW)).toBe('20m left')
    })

    it('never rounds a remaining offer down to 0m', () => {
        expect(formatTimeRemaining('2026-08-22T12:00:30.000Z', NOW)).toBe('1m left')
    })

    it('reports a past end date as expired', () => {
        expect(formatTimeRemaining('2026-08-21T12:00:00.000Z', NOW)).toBe('Expired')
        expect(formatTimeRemaining(NOW.toISOString(), NOW)).toBe('Expired')
    })

    // GamerPower returns a literal "N/A" for key giveaways that run until the
    // keys are gone. Unguarded, that rendered as "NaNd NaNh" on the card.
    it.each([
        ['N/A', 'N/A'],
        ['empty', ''],
        ['nonsense', 'sometime next week'],
    ])('returns null for an unparseable %s end date', (_label, value) => {
        expect(formatTimeRemaining(value, NOW)).toBeNull()
    })

    it('accepts the space-separated form GamerPower publishes', () => {
        expect(formatTimeRemaining('2026-08-23 12:00:00', NOW)).not.toBeNull()
    })
})
