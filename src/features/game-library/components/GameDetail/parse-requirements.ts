export interface RequirementRow {
    label: string
    value: string
}

// Steam's own labels are long enough to wrap the two-column layout. These are
// the ones it actually emits; anything unrecognised passes through untouched.
const SHORT_LABEL: Record<string, string> = {
    os: 'OS',
    'os *': 'OS',
    processor: 'CPU',
    graphics: 'GPU',
    memory: 'RAM',
    storage: 'Disk',
    'hard drive': 'Disk',
    'sound card': 'Audio',
    'additional notes': 'Notes',
    'directx': 'DirectX',
    network: 'Network',
}

const ENTITIES: Record<string, string> = {
    '&amp;': '&', '&lt;': '<', '&gt;': '>', '&quot;': '"', '&#039;': "'", '&apos;': "'", '&nbsp;': ' ',
}

function toText(html: string): string {
    return html
        .replace(/<[^>]*>/g, ' ')
        .replace(/&[a-z#0-9]+;/gi, (m) => ENTITIES[m.toLowerCase()] ?? ' ')
        .replace(/\s+/g, ' ')
        .trim()
}

/**
 * Steam returns requirements as a blob of HTML — a `<strong>` label followed by
 * its value, wrapped in list items. Parsing it into pairs is what lets the panel
 * render a tight two-column spec table instead of dumping markup into the page.
 *
 * Returns [] when the shape is unrecognised, which the band treats as "no data"
 * rather than rendering an empty table.
 */
export function parseRequirements(html: string | undefined): RequirementRow[] {
    if (!html) return []

    const blocks = html.match(/<li[^>]*>[\s\S]*?<\/li>/gi) ?? html.split(/<br\s*\/?>/i)

    const rows: RequirementRow[] = []
    for (const block of blocks) {
        const labelMatch = block.match(/<strong[^>]*>([\s\S]*?)<\/strong>/i)
        const labelHtml = labelMatch?.[1]
        if (!labelMatch || labelHtml === undefined) continue

        const rawLabel = toText(labelHtml).replace(/:\s*$/, '')
        if (!rawLabel) continue

        const value = toText(block.slice(block.indexOf(labelMatch[0]) + labelMatch[0].length))
        // The leading "Minimum:" / "Recommended:" heading has no value of its
        // own — it names the column we are already inside.
        if (!value) continue

        rows.push({ label: SHORT_LABEL[rawLabel.toLowerCase()] ?? rawLabel, value })
    }
    return rows
}
