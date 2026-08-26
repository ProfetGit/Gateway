import { describe, it, expect, vi, beforeEach } from 'vitest'
import { withLibraryLock } from './library-lock'

beforeEach(() => vi.spyOn(console, 'log').mockImplementation(() => {}))

const tick = (ms: number) => new Promise((r) => setTimeout(r, ms))

describe('withLibraryLock', () => {
    it('runs tasks one at a time, never overlapping', async () => {
        const events: string[] = []
        const task = (name: string, ms: number) => async () => {
            events.push(`${name}:start`)
            await tick(ms)
            events.push(`${name}:end`)
        }

        await Promise.all([
            withLibraryLock('a', task('a', 30)),
            withLibraryLock('b', task('b', 5)),
            withLibraryLock('c', task('c', 1)),
        ])

        // Interleaving would produce a:start, b:start, ... — it must not.
        expect(events).toEqual([
            'a:start', 'a:end',
            'b:start', 'b:end',
            'c:start', 'c:end',
        ])
    })

    it('queues rather than rejecting, so a click during a sync still happens', async () => {
        const ran: string[] = []
        const results = await Promise.all([
            withLibraryLock('refresh', async () => { await tick(10); ran.push('refresh'); return 1 }),
            withLibraryLock('import', async () => { ran.push('import'); return 2 }),
        ])
        expect(ran).toEqual(['refresh', 'import'])
        expect(results).toEqual([1, 2])
    })

    it('returns each task\'s own value', async () => {
        await expect(withLibraryLock('x', async () => 'value')).resolves.toBe('value')
    })

    it('propagates a rejection to its own caller', async () => {
        await expect(
            withLibraryLock('boom', async () => { throw new Error('nope') })
        ).rejects.toThrow('nope')
    })

    // A wedged queue would mean the library silently stops syncing for the
    // rest of the session.
    it('keeps running later tasks after one throws', async () => {
        await expect(
            withLibraryLock('bad', async () => { throw new Error('nope') })
        ).rejects.toThrow()

        await expect(withLibraryLock('good', async () => 'still works')).resolves.toBe('still works')
    })

    it('serializes even when an earlier task rejects mid-queue', async () => {
        const ran: string[] = []
        const first = withLibraryLock('a', async () => { await tick(10); ran.push('a'); throw new Error('x') })
        const second = withLibraryLock('b', async () => { ran.push('b') })

        await first.catch(() => undefined)
        await second
        expect(ran).toEqual(['a', 'b'])
    })
})
