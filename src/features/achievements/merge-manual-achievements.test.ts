import { describe, it, expect } from 'vitest'
import { mergeManualAchievements } from './merge-manual-achievements'
import type { AchievementDefinition } from './api/achievement-definitions-schema'

const def = (apiname: string, name: string): AchievementDefinition => ({
    apiname,
    name,
    description: `${name} description`,
    icon: 'icon.jpg',
    icongray: 'icongray.jpg',
    hidden: false,
})

const defs = [def('A_1', 'Charlie'), def('A_2', 'Alpha'), def('A_3', 'Bravo')]

describe('mergeManualAchievements', () => {
    it('reports everything locked when nothing is tracked', () => {
        const result = mergeManualAchievements(defs, {})
        expect(result.success).toBe(true)
        expect(result.totalAchievements).toBe(3)
        expect(result.unlockedCount).toBe(0)
        expect(result.achievements.every((a) => !a.achieved)).toBe(true)
    })

    it('sorts locked achievements alphabetically', () => {
        const result = mergeManualAchievements(defs, {})
        expect(result.achievements.map((a) => a.name)).toEqual(['Alpha', 'Bravo', 'Charlie'])
    })

    it('puts unlocked first, most recent first', () => {
        const result = mergeManualAchievements(defs, { A_1: 100, A_3: 500 })
        expect(result.achievements.map((a) => a.name)).toEqual(['Bravo', 'Charlie', 'Alpha'])
        expect(result.unlockedCount).toBe(2)
    })

    it('passes the unlock timestamp through', () => {
        const result = mergeManualAchievements(defs, { A_2: 1234 })
        const alpha = result.achievements.find((a) => a.apiname === 'A_2')
        expect(alpha?.achieved).toBe(true)
        expect(alpha?.unlocktime).toBe(1234)
    })

    it('ignores unlocks for achievements that no longer exist', () => {
        const result = mergeManualAchievements(defs, { GONE: 999 })
        expect(result.totalAchievements).toBe(3)
        expect(result.unlockedCount).toBe(0)
    })

    it('treats a zero timestamp as unlocked, not as absent', () => {
        const result = mergeManualAchievements(defs, { A_1: 0 })
        expect(result.unlockedCount).toBe(1)
    })
})
