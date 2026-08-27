const CLAN_IMAGE_HOST = 'https://clan.cloudflare.steamstatic.com/images/'

const ENTITIES: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&apos;': "'", '&nbsp;': ' ',
}

function decode(text: string): string {
    return text.replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ')
}

function escapeHtml(text: string): string {
    return text.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] ?? c)
}

/**
 * Plain text for the news band. Steam announcement bodies are BBCode, not HTML,
 * so stripping tags alone left `[img]{STEAM_CLAN_IMAGE}/…[/img]` and `[b]` in
 * the excerpt — which is what made the band look broken.
 */
export function newsExcerpt(contents: string, maxChars = 150): string {
    const text = decode(
        contents
            .replace(/\[img\][\s\S]*?\[\/img\]/gi, ' ')
            .replace(/\[url=[^\]]*\]([\s\S]*?)\[\/url\]/gi, '$1')
            .replace(/\[previewyoutube[^\]]*\][\s\S]*?\[\/previewyoutube\]/gi, ' ')
            .replace(/\[\/?[a-z][^\]]*\]/gi, ' ')
            .replace(/<[^>]*>/g, ' ')
    ).replace(/\s+/g, ' ').trim()

    if (text.length <= maxChars) return text
    const cut = text.slice(0, maxChars)
    const lastSpace = cut.lastIndexOf(' ')
    return `${(lastSpace > maxChars * 0.6 ? cut.slice(0, lastSpace) : cut).trimEnd()}…`
}

/**
 * A small, closed set of tags for the reader. Everything is escaped first and
 * only the tags below are re-introduced, so nothing Steam sends can inject
 * markup — `contents` is third-party text arriving over the network.
 */
export function newsToHtml(contents: string): string {
    let out = escapeHtml(decode(contents))

    out = out
        .replace(/\[img\]\s*\{STEAM_CLAN_(?:LOC_)?IMAGE\}\/?([^[\s]*?)\s*\[\/img\]/gi,
            (_m, p: string) => `<img src="${CLAN_IMAGE_HOST}${p}" alt="" loading="lazy" />`)
        .replace(/\[img\]\s*(https?:\/\/[^[\s]+?)\s*\[\/img\]/gi,
            (_m, url: string) => `<img src="${url}" alt="" loading="lazy" />`)
        .replace(/\[previewyoutube[^\]]*\][\s\S]*?\[\/previewyoutube\]/gi, '')
        .replace(/\[url=(https?:\/\/[^\]]+)\]([\s\S]*?)\[\/url\]/gi,
            (_m, url: string, label: string) => `<a href="${url}" target="_blank" rel="noreferrer">${label}</a>`)
        .replace(/\[h[1-3]\]([\s\S]*?)\[\/h[1-3]\]/gi, '<h4>$1</h4>')
        .replace(/\[(b|strong)\]([\s\S]*?)\[\/(?:b|strong)\]/gi, '<strong>$2</strong>')
        .replace(/\[(i|em)\]([\s\S]*?)\[\/(?:i|em)\]/gi, '<em>$2</em>')
        .replace(/\[u\]([\s\S]*?)\[\/u\]/gi, '<u>$1</u>')
        .replace(/\[quote[^\]]*\]([\s\S]*?)\[\/quote\]/gi, '<blockquote>$1</blockquote>')
        .replace(/\[list\]([\s\S]*?)\[\/list\]/gi, (_m, body: string) =>
            `<ul>${body.replace(/\[\*\]\s*([^[]*)/g, '<li>$1</li>')}</ul>`)
        .replace(/\[\/?[a-z][^\]]*\]/gi, '')

    return out
        .split(/\n{2,}/)
        .map((block) => block.trim())
        .filter(Boolean)
        .map((block) => (/^<(h4|ul|blockquote|img)/.test(block) ? block : `<p>${block.replace(/\n/g, '<br />')}</p>`))
        .join('')
}
