import { describe, it, expect } from 'vitest'
import { tokenizeArgs, parseEnvVars } from './tokenize-args'

// These two fields are typed by hand into the Properties panel, so the cases
// below are the ones a person actually produces, not synthetic grammar probes.

describe('tokenizeArgs', () => {
    it.each([
        ['undefined', undefined, []],
        ['empty', '', []],
        ['only whitespace', '   \t ', []],
        ['plain flags', '-windowed -dx11', ['-windowed', '-dx11']],
        ['collapses runs of whitespace', '  -a \t\n -b  ', ['-a', '-b']],
        ['double-quoted path with spaces', '-config "/home/u/My Games/x.ini"', ['-config', '/home/u/My Games/x.ini']],
        ['single-quoted path with spaces', "-config '/home/u/My Games/x.ini'", ['-config', '/home/u/My Games/x.ini']],
        ['backslash-escaped space', '/home/u/My\\ Games/game.exe', ['/home/u/My Games/game.exe']],
        ['quote glued to the rest of a token', 'PATH="/a b"/c', ['PATH=/a b/c']],
        ['escaped quote inside double quotes', '"say \\"hi\\""', ['say "hi"']],
        ['escaped backslash inside double quotes', '"a\\\\b"', ['a\\b']],
        ['no escapes inside single quotes', "'a\\b'", ['a\\b']],
        ['an empty quoted token is still a token', 'a "" b', ['a', '', 'b']],
    ] as const)('%s', (_label, input, expected) => {
        expect(tokenizeArgs(input)).toEqual(expected)
    })

    // A half-typed value should launch imperfectly, not refuse to launch.
    it.each([
        ['unterminated double quote', '-config "/a/b', ['-config', '/a/b']],
        ['unterminated single quote', "-config '/a/b", ['-config', '/a/b']],
        ['trailing lone backslash', 'a\\', ['a']],
    ] as const)('tolerates %s', (_label, input, expected) => {
        expect(tokenizeArgs(input)).toEqual(expected)
    })
})

describe('parseEnvVars', () => {
    it.each([
        ['space-separated pairs', 'A=1 B=2', { A: '1', B: '2' }],
        ['undefined', undefined, {}],
        ['a token without an =', 'MALFORMED', {}],
        ['first = only, so values may contain =', 'PATH=/a=b', { PATH: '/a=b' }],
        ['a leading = (empty key)', '=novalue', {}],
        ['an empty value', 'EMPTY=', { EMPTY: '' }],
    ] as const)('handles %s', (_label, input, expected) => {
        expect(parseEnvVars(input)).toEqual(expected)
    })

    // The real reason this moved off a whitespace split: DXVK overrides are
    // comma-separated and people quote them.
    it('keeps a quoted value with commas and = signs in one token', () => {
        expect(parseEnvVars('WINEDLLOVERRIDES="d3d11,d3d10core=n,b" DXVK_HUD=fps')).toEqual({
            WINEDLLOVERRIDES: 'd3d11,d3d10core=n,b',
            DXVK_HUD: 'fps',
        })
    })

    it('keeps a quoted path with spaces in one token', () => {
        expect(parseEnvVars('WINEPREFIX="/home/u/My Prefixes/a"')).toEqual({
            WINEPREFIX: '/home/u/My Prefixes/a',
        })
    })
})
