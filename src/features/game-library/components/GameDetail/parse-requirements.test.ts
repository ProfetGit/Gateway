import { describe, expect, it } from 'vitest'
import { parseRequirements } from './parse-requirements'

// Shape Steam actually returns for pcRequirements.minimum.
const STEAM_HTML =
    '<strong>Minimum:</strong><br><ul class="bb_ul">' +
    '<li><strong>OS:</strong> Ubuntu 20.04<br></li>' +
    '<li><strong>Processor:</strong> Intel Core i5-3470 / AMD FX-6300<br></li>' +
    '<li><strong>Memory:</strong> 4 GB RAM<br></li>' +
    '<li><strong>Graphics:</strong> GeForce GTX 660<br></li>' +
    '<li><strong>Storage:</strong> 9 GB available space</li></ul>'

describe('parseRequirements', () => {
    it('parses Steam list markup into label/value pairs', () => {
        expect(parseRequirements(STEAM_HTML)).toEqual([
            { label: 'OS', value: 'Ubuntu 20.04' },
            { label: 'CPU', value: 'Intel Core i5-3470 / AMD FX-6300' },
            { label: 'RAM', value: '4 GB RAM' },
            { label: 'GPU', value: 'GeForce GTX 660' },
            { label: 'Disk', value: '9 GB available space' },
        ])
    })

    it('drops the leading heading, which has no value of its own', () => {
        expect(parseRequirements(STEAM_HTML).some((r) => r.label === 'Minimum')).toBe(false)
    })

    it('falls back to <br>-separated pairs when there is no list', () => {
        const html = '<strong>OS:</strong> SteamOS 3<br><strong>Memory:</strong> 8 GB RAM'
        expect(parseRequirements(html)).toEqual([
            { label: 'OS', value: 'SteamOS 3' },
            { label: 'RAM', value: '8 GB RAM' },
        ])
    })

    it('decodes entities and collapses whitespace', () => {
        const html = '<li><strong>GPU:</strong> Radeon&nbsp;RX 580 &amp;&nbsp;up</li>'
        expect(parseRequirements(html)).toEqual([{ label: 'GPU', value: 'Radeon RX 580 & up' }])
    })

    it('keeps unrecognised labels as Steam wrote them', () => {
        expect(parseRequirements('<li><strong>VR Support:</strong> SteamVR</li>'))
            .toEqual([{ label: 'VR Support', value: 'SteamVR' }])
    })

    it('returns nothing for missing or unparseable input', () => {
        expect(parseRequirements(undefined)).toEqual([])
        expect(parseRequirements('')).toEqual([])
        expect(parseRequirements('<p>Requires a 64-bit processor</p>')).toEqual([])
    })
})
