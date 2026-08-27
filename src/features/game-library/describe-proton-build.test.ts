import { describe, expect, it } from 'vitest'
import { describeProtonBuild, protonRetryChoices } from './describe-proton-build'

const build = (name: string, path = `/tools/${name}`) => ({ name, path })

describe('describeProtonBuild', () => {
    it('names builds by what they are for, not by their directory', () => {
        expect(describeProtonBuild(build('GE-Proton11-5-x86_64')).label).toBe('Proton GE 11-5')
        expect(describeProtonBuild(build('proton-cachyos-slr')).label).toBe('Proton CachyOS')
        expect(describeProtonBuild(build('UMU-Proton-10.0-4')).label).toBe('Standard Proton 10.0-4')
    })

    it('ranks GE first and CachyOS second — the two that rescue installers most often', () => {
        const ge = describeProtonBuild(build('GE-Proton11-5'))
        const cachy = describeProtonBuild(build('Proton-CachyOS Latest'))
        const umu = describeProtonBuild(build('UMU-Proton-10.0-4'))
        expect(ge.rank).toBeLessThan(cachy.rank)
        expect(cachy.rank).toBeLessThan(umu.rank)
    })

    it('falls back to the raw name for builds it does not recognise', () => {
        const other = describeProtonBuild(build('Proton-Tkg-Custom'))
        expect(other.label).toBe('Proton-Tkg-Custom')
        expect(other.blurb).toContain('installed on this system')
    })
})

describe('protonRetryChoices', () => {
    const builds = [
        build('UMU-Proton-10.0-4'),
        build('GE-Proton11-5-x86_64'),
        build('proton-cachyos-slr'),
    ]

    it('never offers the build that just failed', () => {
        const choices = protonRetryChoices(builds, '/tools/GE-Proton11-5-x86_64')
        expect(choices.some((c) => c.path === '/tools/GE-Proton11-5-x86_64')).toBe(false)
    })

    it('offers the most promising build first', () => {
        expect(protonRetryChoices(builds, '')[0]?.label).toBe('Proton GE 11-5')
    })

    it('offers the automatic default back once a specific build was tried', () => {
        const choices = protonRetryChoices(builds, '/tools/proton-cachyos-slr')
        expect(choices.some((c) => c.path === '')).toBe(true)
    })

    it('does not offer the default when the default is what failed', () => {
        expect(protonRetryChoices(builds, '').some((c) => c.path === '')).toBe(false)
    })

    it('keeps the list short enough to be a choice, not a menu', () => {
        expect(protonRetryChoices(builds, '')).toHaveLength(3)
        expect(protonRetryChoices(builds, '', 2)).toHaveLength(2)
    })

    it('copes with nothing else installed', () => {
        expect(protonRetryChoices([], '')).toEqual([])
    })
})
