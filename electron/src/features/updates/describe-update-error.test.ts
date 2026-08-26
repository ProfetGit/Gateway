import { describe, it, expect } from 'vitest'
import { describeUpdateError } from './describe-update-error'

// The real message that reached the Settings panel: a 404 on releases.atom
// with the whole HTTP response inlined, GitHub's Set-Cookie values included.
const REAL_404 = `Error invoking remote method 'check_for_updates': HttpError: 404
method: GET url: https://github.com/ProfetGit/Gateway/releases.atom

Please double check that your authentication token is correct. Due to security reasons, actual response of the server will not be reported, but 404.
 Headers: {
  "content-security-policy": "default-src 'none'",
  "set-cookie": [
    "_gh_sess=ZLVF%2FvsvCBwTjagfmGkrHdaukvkrVijYodfpZhUXly2lv%2BNtXzErAcAy7tbO3sLqpCg%3D%3D; path=/; secure; HttpOnly; SameSite=Lax",
    "_octo=GH1.1.1764922063.1787749828; expires=Thu, 26 Aug 2027 13:10:28 GMT; domain=.github.com; path=/; secure; SameSite=Lax",
    "logged_in=no; expires=Thu, 26 Aug 2027 13:10:28 GMT; domain=.github.com; path=/; secure; HttpOnly; SameSite=Lax"
  ]
}`

describe('describeUpdateError', () => {
    it('reduces the real 404 dump to one sentence', () => {
        expect(describeUpdateError(new Error(REAL_404))).toBe('No update is published yet.')
    })

    // The point of the whole module: session cookies must never reach the UI.
    it.each(['_gh_sess', '_octo', 'set-cookie', 'Headers', 'logged_in'])(
        'never leaks %s',
        (fragment) => {
            expect(describeUpdateError(new Error(REAL_404))).not.toContain(fragment)
        }
    )

    it('never returns a multi-line message', () => {
        expect(describeUpdateError(new Error(REAL_404))).not.toContain('\n')
    })

    it.each([
        ['a bare 404', 'HttpError: 404 not found', 'No update is published yet.'],
        ['no published versions', 'Cannot find latest release', 'No update is published yet.'],
        ['DNS failure', 'getaddrinfo ENOTFOUND github.com', "Couldn't reach the update server. Check your connection and try again."],
        ['a refused connection', 'connect ECONNREFUSED 140.82.121.3:443', "Couldn't reach the update server. Check your connection and try again."],
        ['an unpackaged dev run', 'Error: application is not packaged', 'Updates only run in the installed app.'],
        ['a server fault', 'HttpError: 503 Service Unavailable', 'The update server is having trouble. Try again later.'],
    ] as const)('maps %s', (_label, raw, expected) => {
        expect(describeUpdateError(new Error(raw))).toBe(expected)
    })

    // Dropped in /opt, the AppImage cannot rewrite itself — a real failure
    // mode called out in updates-ipc.ts.
    it('explains a read-only install location', () => {
        expect(describeUpdateError(new Error("EACCES: permission denied, open '/opt/Gateway.AppImage'")))
            .toContain('Move it somewhere you own')
    })

    it('keeps a short unrecognised message as-is', () => {
        expect(describeUpdateError(new Error('Update file is corrupted'))).toBe('Update file is corrupted')
    })

    it('replaces a long unrecognised message rather than truncating mid-sentence', () => {
        expect(describeUpdateError(new Error('x'.repeat(400))))
            .toBe('Something went wrong checking for updates.')
    })

    it.each([
        ['a non-Error value', 'boom'],
        ['null', null],
        ['undefined', undefined],
    ] as const)('handles %s', (_label, value) => {
        expect(typeof describeUpdateError(value)).toBe('string')
    })

    it('has something to say for an empty message', () => {
        expect(describeUpdateError(new Error(''))).toBe('Something went wrong checking for updates.')
    })
})
