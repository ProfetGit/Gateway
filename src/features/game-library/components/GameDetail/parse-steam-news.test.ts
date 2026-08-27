import { describe, expect, it } from 'vitest'
import { newsExcerpt, newsToHtml } from './parse-steam-news'

describe('newsExcerpt', () => {
    it('strips the BBCode that Steam announcement feeds return', () => {
        const raw = '[img]{STEAM_CLAN_IMAGE}/1234/abc.png[/img][b]Patch 1.2.4[/b]\nBellhart crash fixed.'
        expect(newsExcerpt(raw)).toBe('Patch 1.2.4 Bellhart crash fixed.')
    })

    it('keeps the label from a link and drops the url', () => {
        expect(newsExcerpt('See the [url=https://example.com]full notes[/url] here'))
            .toBe('See the full notes here')
    })

    it('strips HTML for the feeds that send markup instead', () => {
        expect(newsExcerpt('<p>Now <b>Deck Verified</b></p>')).toBe('Now Deck Verified')
    })

    it('decodes entities', () => {
        expect(newsExcerpt('Tools &amp; traps &#039;n stuff')).toBe("Tools & traps 'n stuff")
    })

    it('truncates on a word boundary with an ellipsis', () => {
        const out = newsExcerpt('alpha bravo charlie delta echo foxtrot', 20)
        expect(out.endsWith('…')).toBe(true)
        expect(out.length).toBeLessThanOrEqual(21)
        expect(out).not.toContain('foxtrot')
    })

    it('leaves short text untouched', () => {
        expect(newsExcerpt('Short note', 150)).toBe('Short note')
    })
})

describe('newsToHtml', () => {
    it('converts the tags the reader supports', () => {
        const html = newsToHtml('[b]Bold[/b] and [i]italic[/i]')
        expect(html).toContain('<strong>Bold</strong>')
        expect(html).toContain('<em>italic</em>')
    })

    it('resolves Steam clan image placeholders to real urls', () => {
        expect(newsToHtml('[img]{STEAM_CLAN_IMAGE}/1234/abc.png[/img]'))
            .toContain('<img src="https://clan.cloudflare.steamstatic.com/images/1234/abc.png"')
    })

    it('escapes markup so injected html cannot execute', () => {
        const html = newsToHtml('<script>alert(1)</script> and <img onerror="x">')
        expect(html).not.toContain('<script>')
        expect(html).toContain('&lt;script&gt;')
        // The attribute survives as inert text; what matters is that no live
        // <img> element carries it.
        expect(html).not.toMatch(/<img[^>]*onerror/)
    })

    it('keeps link labels and targets', () => {
        const html = newsToHtml('[url=https://example.com]Notes[/url]')
        expect(html).toContain('href="https://example.com"')
        expect(html).toContain('>Notes</a>')
    })

    it('builds lists from [*] items', () => {
        const html = newsToHtml('[list][*]One[*]Two[/list]')
        expect(html).toContain('<li>One</li>')
        expect(html).toContain('<li>Two</li>')
    })

    it('drops unsupported bbcode rather than printing it', () => {
        expect(newsToHtml('[randomtag]text[/randomtag]')).toBe('<p>text</p>')
    })

    it('splits blank lines into paragraphs', () => {
        expect(newsToHtml('First para\n\nSecond para')).toBe('<p>First para</p><p>Second para</p>')
    })
})
