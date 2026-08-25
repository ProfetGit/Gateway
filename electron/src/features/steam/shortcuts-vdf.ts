import fs from 'node:fs'

export interface NonSteamShortcut {
    appid: string
    appName: string
    exe: string
    startDir?: string
    launchOptions?: string
    isHidden: boolean
}

type VdfNode = string | number | { [key: string]: VdfNode }

function stripQuotes(value: string): string {
    return value.replace(/^"(.*)"$/, '$1')
}

/**
 * shortcuts.vdf is Valve's *binary* KeyValues format (distinct from the
 * text VDF used by appmanifest/libraryfolders elsewhere in this file) —
 * a flat run of (type-byte, null-terminated key, value) triples, with
 * nested maps closed by a 0x08 byte. Type 0x00 = nested map, 0x01 =
 * string, 0x02 = int32.
 */
function parseBinaryVdfObject(buf: Buffer, pos: { offset: number }): Record<string, VdfNode> {
    const obj: Record<string, VdfNode> = {}

    while (pos.offset < buf.length) {
        const type = buf[pos.offset]
        pos.offset++
        if (type === 0x08) break

        const keyStart = pos.offset
        while (pos.offset < buf.length && buf[pos.offset] !== 0x00) pos.offset++
        const key = buf.toString('utf8', keyStart, pos.offset)
        pos.offset++ // skip the key's null terminator

        if (type === 0x00) {
            obj[key] = parseBinaryVdfObject(buf, pos)
        } else if (type === 0x01) {
            const valStart = pos.offset
            while (pos.offset < buf.length && buf[pos.offset] !== 0x00) pos.offset++
            obj[key] = buf.toString('utf8', valStart, pos.offset)
            pos.offset++
        } else if (type === 0x02) {
            obj[key] = buf.readUInt32LE(pos.offset)
            pos.offset += 4
        } else {
            // Unrecognized field type — abort rather than silently misread
            // every field after it.
            throw new Error(`Unknown shortcuts.vdf field type 0x${type.toString(16)} at offset ${pos.offset - 1} (key "${key}")`)
        }
    }

    return obj
}

export function parseShortcutsVdf(filePath: string): NonSteamShortcut[] {
    if (!fs.existsSync(filePath)) return []

    const buf = fs.readFileSync(filePath)
    const root = parseBinaryVdfObject(buf, { offset: 0 })
    const shortcuts = root['shortcuts']

    if (typeof shortcuts !== 'object' || shortcuts === null) return []

    const result: NonSteamShortcut[] = []

    for (const entry of Object.values(shortcuts)) {
        if (typeof entry !== 'object' || entry === null) continue
        const e = entry as Record<string, VdfNode>

        const appid = e['appid']
        const appName = e['AppName'] ?? e['appname']
        const exe = e['Exe'] ?? e['exe']

        if (appid === undefined || typeof appName !== 'string' || !appName || typeof exe !== 'string' || !exe) continue

        const startDir = e['StartDir']
        const launchOptions = e['LaunchOptions']

        result.push({
            appid: String(appid),
            appName,
            exe: stripQuotes(exe),
            startDir: typeof startDir === 'string' ? stripQuotes(startDir) : undefined,
            launchOptions: typeof launchOptions === 'string' && launchOptions ? launchOptions : undefined,
            isHidden: e['IsHidden'] === 1,
        })
    }

    return result
}
