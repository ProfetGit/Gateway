import { describe, it, expect } from 'vitest'
import { normalizeAchievementData } from '../../../electron/src/features/achievements/parse-achievement-file'
import { diffUnlocks } from '../../../electron/src/features/achievements/diff-unlocks'

describe('normalizeAchievementData', () => {
    it('reads the Goldberg/Uplay shape (earned / earned_time)', () => {
        const result = normalizeAchievementData({
            ACH_ONE: { earned: true, earned_time: 1700000000 },
            ACH_TWO: { earned: false, earned_time: 0 },
        })
        expect(result).toHaveLength(2)
        const one = result.find((a) => a.name === 'ACH_ONE')
        expect(one?.achieved).toBe(true)
        expect(one?.unlockTime).toBe(1700000000)
        expect(result.find((a) => a.name === 'ACH_TWO')?.achieved).toBe(false)
    })

    it('reads a JSON array with apiname keys', () => {
        const result = normalizeAchievementData([
            { name: 'ACH_A', earned: true, earned_time: 500 },
            { name: 'ACH_B', earned: false },
        ])
        expect(result.find((a) => a.name === 'ACH_A')?.achieved).toBe(true)
        expect(result.find((a) => a.name === 'ACH_B')?.achieved).toBe(false)
    })

    it('accepts the other emulator spellings', () => {
        const result = normalizeAchievementData({
            A: { Achieved: 1, UnlockTime: 10 },
            B: { State: '1', Time: 20 },
            C: { HaveAchieved: 1, HaveAchievedTime: 30 },
            D: { Unlocked: true, unlocktime: 40 },
        })
        expect(result.filter((a) => a.achieved)).toHaveLength(4)
    })

    it('infers completion from full progress when no flag is set', () => {
        const result = normalizeAchievementData({
            A: { earned: false, CurProgress: 50, MaxProgress: 50 },
        })
        expect(result[0]?.achieved).toBe(true)
    })

    it('reads the nested progress object the Uplay writer uses', () => {
        const result = normalizeAchievementData([
            { name: 'DONE', have_condition: true, progress: { value: 5, max_value: 5 } },
            { name: 'PART', have_condition: true, progress: { value: 2, max_value: 5 } },
        ])
        expect(result.find((a) => a.name === 'DONE')?.achieved).toBe(true)
        expect(result.find((a) => a.name === 'PART')?.achieved).toBe(false)
        expect(result.find((a) => a.name === 'PART')?.maxProgress).toBe(5)
    })

    it('does not mistake have_condition for an unlock', () => {
        // The real schema ships every entry with have_condition:true and zeroed
        // progress — treating that as earned would announce all 49 at once.
        const result = normalizeAchievementData([
            { name: 'ACObsidian_Ach_1', have_condition: true, progress: { value: 0, max_value: 0 } },
            { name: 'ACObsidian_Ach_2', have_condition: true, progress: { value: 0, max_value: 0 } },
        ])
        expect(result.filter((a) => a.achieved)).toHaveLength(0)
    })

    it('ignores the emulator bookkeeping keys', () => {
        const result = normalizeAchievementData({
            SteamAchievements: { earned: true },
            Steam64: { earned: true },
            REAL: { earned: true },
        })
        expect(result.map((a) => a.name)).toEqual(['REAL'])
    })

    it('survives junk input', () => {
        expect(normalizeAchievementData(null)).toEqual([])
        expect(normalizeAchievementData('nonsense')).toEqual([])
    })
})

describe('diffUnlocks', () => {
    const now = 1_700_000_000

    it('reports only newly-earned achievements', () => {
        const parsed = normalizeAchievementData({
            OLD: { earned: true, earned_time: now - 100 },
            NEW: { earned: true, earned_time: now - 5 },
            LOCKED: { earned: false },
        })
        const { newlyUnlocked, merged } = diffUnlocks(parsed, { OLD: now - 100 }, now)
        expect(newlyUnlocked.map((a) => a.name)).toEqual(['NEW'])
        expect(Object.keys(merged).sort()).toEqual(['NEW', 'OLD'])
    })

    it('announces nothing when the file is merely rewritten', () => {
        const parsed = normalizeAchievementData({ A: { earned: true, earned_time: now - 10 } })
        const { newlyUnlocked } = diffUnlocks(parsed, { A: now - 10 }, now)
        expect(newlyUnlocked).toEqual([])
    })

    it('records but does not announce back-dated unlocks (restored save)', () => {
        const parsed = normalizeAchievementData({
            ANCIENT: { earned: true, earned_time: now - 60 * 60 * 24 * 30 },
        })
        const { newlyUnlocked, merged } = diffUnlocks(parsed, {}, now)
        expect(newlyUnlocked).toEqual([])
        expect(merged.ANCIENT).toBeDefined()
    })

    it('stamps the current time when the emulator records none', () => {
        const parsed = normalizeAchievementData({ A: { earned: true, earned_time: 0 } })
        const { newlyUnlocked } = diffUnlocks(parsed, {}, now)
        expect(newlyUnlocked[0]?.unlockTime).toBe(now)
    })

    it('handles several unlocking at once', () => {
        const parsed = normalizeAchievementData({
            A: { earned: true, earned_time: now - 3 },
            B: { earned: true, earned_time: now - 2 },
        })
        const { newlyUnlocked } = diffUnlocks(parsed, {}, now)
        expect(newlyUnlocked).toHaveLength(2)
    })
})

describe('resolveAchievementNames', () => {
    const defs = Array.from({ length: 5 }, (_, i) => ({
        apiname: `ACObsidian_Ach_${i + 1}`,
        name: `Title ${i + 1}`,
        description: '',
        icon: '',
        icongray: '',
        hidden: false,
    }))

    it('maps a bare numeric position to the matching apiname', async () => {
        const { resolveAchievementNames } = await import('../../../electron/src/features/achievements/resolve-achievement-name')
        const parsed = normalizeAchievementData({ '3': { earned: true, earned_time: 100 } })
        const resolved = resolveAchievementNames(parsed, defs)
        expect(resolved[0]?.name).toBe('ACObsidian_Ach_3')
    })

    it('leaves an already-correct apiname untouched', async () => {
        const { resolveAchievementNames } = await import('../../../electron/src/features/achievements/resolve-achievement-name')
        const parsed = normalizeAchievementData({ ACObsidian_Ach_2: { earned: true, earned_time: 1 } })
        const resolved = resolveAchievementNames(parsed, defs)
        expect(resolved[0]?.name).toBe('ACObsidian_Ach_2')
    })

    it('leaves an out-of-range numeric id unresolved rather than mismatching', async () => {
        const { resolveAchievementNames } = await import('../../../electron/src/features/achievements/resolve-achievement-name')
        const parsed = normalizeAchievementData({ '999': { earned: true, earned_time: 1 } })
        const resolved = resolveAchievementNames(parsed, defs)
        expect(resolved[0]?.name).toBe('999')
    })

    it('passes through unchanged when no definitions are available', async () => {
        const { resolveAchievementNames } = await import('../../../electron/src/features/achievements/resolve-achievement-name')
        const parsed = normalizeAchievementData({ '3': { earned: true, earned_time: 1 } })
        const resolved = resolveAchievementNames(parsed, [])
        expect(resolved[0]?.name).toBe('3')
    })
})

describe('detectAchievementTracking', () => {
    it('reports flag-off when a known enable key is set to 0', async () => {
        const { detectAchievementTracking } = await import('../../../electron/src/features/achievements/detect-achievement-tracking')
        const fs = await import('node:fs')
        const os = await import('node:os')
        const path = await import('node:path')

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-tracking-test-'))
        fs.writeFileSync(path.join(dir, 'upc_r2.ini'), '[Settings]\nAchievements = 0\nLogging = 0\n')

        const status = await detectAchievementTracking({ gameDir: dir })
        expect(status.summary).toBe('flag-off')
        expect(status.flags[0]?.key).toBe('Achievements')
        expect(status.flags[0]?.enabled).toBe(false)

        fs.rmSync(dir, { recursive: true, force: true })
    })

    it('reports unknown when nothing recognizable is found', async () => {
        const { detectAchievementTracking } = await import('../../../electron/src/features/achievements/detect-achievement-tracking')
        const fs = await import('node:fs')
        const os = await import('node:os')
        const path = await import('node:path')

        const dir = fs.mkdtempSync(path.join(os.tmpdir(), 'gateway-tracking-test-'))
        const status = await detectAchievementTracking({ gameDir: dir })
        expect(status.summary).toBe('unknown')

        fs.rmSync(dir, { recursive: true, force: true })
    })
})
