import { describe, expect, it } from 'vitest'
import { rankNextUp, rarityTier, selectAchievements } from './rank-achievements'
import type { Achievement } from './api/achievements-schema'

function ach(name: string, achieved: boolean, globalPercent?: number, unlocktime = 0): Achievement {
    return {
        apiname: name.toLowerCase().replace(/\s/g, '_'),
        name,
        description: `${name} description`,
        achieved,
        unlocktime,
        icon: '',
        icongray: '',
        globalPercent,
    }
}

describe('rarityTier', () => {
    it('bands by how many players own it', () => {
        expect(rarityTier(84)).toBe('common')
        expect(rarityTier(50)).toBe('common')
        expect(rarityTier(49.9)).toBe('uncommon')
        expect(rarityTier(20)).toBe('uncommon')
        expect(rarityTier(19.9)).toBe('rare')
        expect(rarityTier(5)).toBe('rare')
        expect(rarityTier(4.9)).toBe('ultra')
        expect(rarityTier(0)).toBe('ultra')
    })

    it('returns null when Steam gave no global stats', () => {
        expect(rarityTier(undefined)).toBeNull()
        expect(rarityTier(Number.NaN)).toBeNull()
    })
})

describe('rankNextUp', () => {
    it('ranks locked achievements by how many players already have them', () => {
        const list = [ach('Rare', false, 4), ach('Easy', false, 84), ach('Mid', false, 40)]
        expect(rankNextUp(list).map((a) => a.name)).toEqual(['Easy', 'Mid', 'Rare'])
    })

    it('excludes what the player already unlocked', () => {
        const list = [ach('Done', true, 90), ach('Todo', false, 10)]
        expect(rankNextUp(list).map((a) => a.name)).toEqual(['Todo'])
    })

    it('sorts achievements with no global data last, not first', () => {
        const list = [ach('Unknown', false, undefined), ach('Known', false, 12)]
        expect(rankNextUp(list).map((a) => a.name)).toEqual(['Known', 'Unknown'])
    })

    it('applies the limit after ranking, not before', () => {
        const list = [ach('Third', false, 10), ach('First', false, 90), ach('Second', false, 50)]
        expect(rankNextUp(list, 2).map((a) => a.name)).toEqual(['First', 'Second'])
    })

    it('returns everything when no limit is given', () => {
        expect(rankNextUp([ach('A', false, 1), ach('B', false, 2)])).toHaveLength(2)
    })
})

describe('selectAchievements', () => {
    const list = [
        ach('Alpha', false, 80),
        ach('Beta', true, 60, 500),
        ach('Gamma', false, 5),
        ach('Delta', true, 30, 900),
    ]

    it('shows locked ranked by attainability for next and locked', () => {
        expect(selectAchievements(list, 'next').map((a) => a.name)).toEqual(['Alpha', 'Gamma'])
        expect(selectAchievements(list, 'locked').map((a) => a.name)).toEqual(['Alpha', 'Gamma'])
    })

    it('shows unlocked most-recent-first', () => {
        expect(selectAchievements(list, 'unlocked').map((a) => a.name)).toEqual(['Delta', 'Beta'])
    })

    it('puts locked before unlocked for all', () => {
        expect(selectAchievements(list, 'all').map((a) => a.name)).toEqual(['Alpha', 'Gamma', 'Beta', 'Delta'])
    })

    it('searches name and description, case insensitively', () => {
        expect(selectAchievements(list, 'all', 'gamm').map((a) => a.name)).toEqual(['Gamma'])
        expect(selectAchievements(list, 'all', 'DESCRIPTION')).toHaveLength(4)
        expect(selectAchievements(list, 'all', 'nothing')).toHaveLength(0)
    })
})
