// ═══════════════════════════════════════════════════════════
// Shell-ish tokenizer for user-entered launch arguments and env vars
// ═══════════════════════════════════════════════════════════
//
// Both fields are free text typed by a person into a box, so they carry the
// things people actually type: paths with spaces, quoted values, commas.
// Splitting on bare whitespace — which is what this replaced — silently
// mangles `-config "/home/u/My Games/x.ini"` into three arguments and
// `WINEDLLOVERRIDES="d3d11,d3d10core=n,b"` into a value with a stray quote.
//
// This is NOT a shell. No variable expansion, no globbing, no command
// substitution, no operators — the tokens go straight to spawn() without a
// shell, and keeping the grammar this small is what makes that safe.

/**
 * Split a command-line-ish string into tokens.
 *
 * - `'…'` is literal: no escapes inside.
 * - `"…"` honours `\"` and `\\`; every other backslash stays literal, which is
 *   what makes Windows-style paths survive being pasted in.
 * - Outside quotes, `\` escapes the next character (so `My\ Games` works).
 * - An unterminated quote consumes to end of input rather than throwing. A
 *   half-typed value should launch imperfectly, not refuse to launch at all.
 */
export function tokenizeArgs(input: string | undefined): string[] {
    const source = input ?? ''
    const tokens: string[] = []
    let current = ''
    let started = false // distinguishes '' (a real empty token) from no token

    for (let i = 0; i < source.length; i++) {
        const char = source[i] as string

        if (/\s/.test(char)) {
            if (started) {
                tokens.push(current)
                current = ''
                started = false
            }
            continue
        }

        started = true

        if (char === '\\') {
            if (i + 1 < source.length) current += source[++i] as string
            continue
        }

        if (char === "'") {
            const end = source.indexOf("'", i + 1)
            if (end === -1) {
                current += source.slice(i + 1)
                i = source.length
            } else {
                current += source.slice(i + 1, end)
                i = end
            }
            continue
        }

        if (char === '"') {
            i++
            while (i < source.length && source[i] !== '"') {
                if (source[i] === '\\' && (source[i + 1] === '"' || source[i + 1] === '\\')) {
                    current += source[++i] as string
                } else {
                    current += source[i] as string
                }
                i++
            }
            continue
        }

        current += char
    }

    if (started) tokens.push(current)
    return tokens
}

/**
 * Parse a "VAR=value VAR2=value2" string into an env object. Each token is
 * split on its FIRST '=' only, so values may themselves contain '='.
 * Tokens without an '=', and tokens with an empty key, are ignored.
 */
export function parseEnvVars(input: string | undefined): Record<string, string> {
    const env: Record<string, string> = {}
    for (const token of tokenizeArgs(input)) {
        const eq = token.indexOf('=')
        if (eq > 0) env[token.slice(0, eq)] = token.slice(eq + 1)
    }
    return env
}
