import { describe, it, expect } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

// ═══════════════════════════════════════════════════════════
// IPC wire contract
// ═══════════════════════════════════════════════════════════
//
// electron/preload.ts is a fully generic passthrough with no channel
// allowlist, so a renderer invoke() with no matching ipcMain.handle is
// invisible until a user clicks the thing — there is no typecheck, no lint,
// and no startup error. This test is the only thing standing between a typo
// and a dead button.
//
// It matches LITERAL channel strings only. That is deliberate: it also
// enforces "no computed channel names", which is already the de-facto rule
// everywhere in the repo.

const dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(dirname, '../..')

function collectFiles(dir: string): string[] {
    const out: string[] = []
    for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
        if (entry.name === 'node_modules' || entry.name.startsWith('.')) continue
        const full = path.join(dir, entry.name)
        if (entry.isDirectory()) out.push(...collectFiles(full))
        else if (entry.name.endsWith('.ts') || entry.name.endsWith('.tsx')) out.push(full)
    }
    return out
}

function matchAll(files: string[], pattern: RegExp): Set<string> {
    const found = new Set<string>()
    for (const file of files) {
        const source = fs.readFileSync(file, 'utf-8')
        for (const match of source.matchAll(pattern)) {
            if (match[1]) found.add(match[1])
        }
    }
    return found
}

const electronFiles = collectFiles(path.join(REPO_ROOT, 'electron'))
const rendererFiles = collectFiles(path.join(REPO_ROOT, 'src'))

const handlers = matchAll(electronFiles, /ipcMain\.handle\(\s*['"]([\w-]+)['"]/g)
const invocations = matchAll(rendererFiles, /\binvoke(?:<[^>]*>)?\(\s*['"]([\w-]+)['"]/g)
const emitted = matchAll(electronFiles, /webContents\.send\(\s*['"]([\w-]+)['"]/g)
const listened = matchAll(rendererFiles, /\blisten(?:<[^>]*>)?\(\s*['"]([\w-]+)['"]/g)

/** Handlers with no renderer caller. Kept visible without failing the build. */
const KNOWN_UNUSED_HANDLERS: string[] = []

/** Events the main process sends that nothing listens for yet. */
const KNOWN_UNUSED_EVENTS = ['main-process-message']

describe('IPC contract', () => {
    it('finds handlers and invocations at all (guards the regexes themselves)', () => {
        expect(handlers.size).toBeGreaterThan(30)
        expect(invocations.size).toBeGreaterThan(30)
    })

    // The direction that actually breaks at runtime.
    it('every renderer invoke() has a matching ipcMain.handle', () => {
        const missing = [...invocations].filter((channel) => !handlers.has(channel)).sort()
        expect(missing).toEqual([])
    })

    it('every ipcMain.handle has a renderer caller', () => {
        const unused = [...handlers]
            .filter((channel) => !invocations.has(channel))
            .filter((channel) => !KNOWN_UNUSED_HANDLERS.includes(channel))
            .sort()
        expect(unused).toEqual([])
    })

    // Porting handlers back from git history is exactly how kebab-case
    // channels get reintroduced — the deleted Heroic and Lutris IPC files
    // used get-heroic-status / sync-lutris.
    it('every handler channel is snake_case', () => {
        const malformed = [...handlers].filter((c) => !/^[a-z0-9]+(_[a-z0-9]+)*$/.test(c)).sort()
        expect(malformed).toEqual([])
    })

    it('every renderer listen() has a matching webContents.send', () => {
        const missing = [...listened].filter((event) => !emitted.has(event)).sort()
        expect(missing).toEqual([])
    })

    it('every emitted event has a renderer listener', () => {
        const unused = [...emitted]
            .filter((event) => !listened.has(event))
            .filter((event) => !KNOWN_UNUSED_EVENTS.includes(event))
            .sort()
        expect(unused).toEqual([])
    })

    // Push events are kebab-case by existing convention; the invoke channels
    // are snake_case. Both are fine, but they must not drift within a kind.
    it('every push event is kebab-case', () => {
        const malformed = [...emitted].filter((e) => !/^[a-z0-9]+(-[a-z0-9]+)*$/.test(e)).sort()
        expect(malformed).toEqual([])
    })
})
