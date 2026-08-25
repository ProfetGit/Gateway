import { describe, it, expect } from 'vitest'
import { UpdateStatusSchema } from './update-schema'

// Parsed inside a listen() callback, where a throw would kill the listener and
// silently freeze the Settings panel on whatever it last showed.

describe('UpdateStatusSchema', () => {
    it.each([
        { state: 'checking' },
        { state: 'available', version: '1.2.0' },
        { state: 'current' },
        { state: 'downloading', percent: 42.5 },
        { state: 'ready', version: '1.2.0' },
        { state: 'error', message: 'no write access' },
    ])('accepts %o', (payload) => {
        expect(UpdateStatusSchema.parse(payload)).toEqual(payload)
    })

    it.each([
        ['unknown state', { state: 'bogus' }],
        ['available without version', { state: 'available' }],
        ['percent as string', { state: 'downloading', percent: 'lots' }],
        ['error without message', { state: 'error' }],
        ['no state at all', {}],
        ['null', null],
    ] as const)('rejects %s', (_label, payload) => {
        expect(UpdateStatusSchema.safeParse(payload).success).toBe(false)
    })
})
