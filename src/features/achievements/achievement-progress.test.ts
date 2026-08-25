import { describe, it, expect } from 'vitest'
import { computeCompletionPercent } from './achievement-progress'

describe('computeCompletionPercent', () => {
    it('returns 0 when there are no achievements', () => {
        expect(computeCompletionPercent(0, 0)).toBe(0)
        expect(computeCompletionPercent(5, 0)).toBe(0)
    })

    it('returns 100 only on exact completion', () => {
        expect(computeCompletionPercent(200, 200)).toBe(100)
    })

    it('floors rather than rounds, so near-complete never reads 100', () => {
        expect(computeCompletionPercent(199, 200)).toBe(99)
    })

    it('floors partial progress', () => {
        expect(computeCompletionPercent(1, 3)).toBe(33)
        expect(computeCompletionPercent(2, 3)).toBe(66)
        expect(computeCompletionPercent(3, 60)).toBe(5)
    })

    it('clamps over-completion to 100', () => {
        expect(computeCompletionPercent(201, 200)).toBe(100)
    })
})
