// The one place the field chrome is described. Before this existed the same
// class string was pasted into every form in the app, which is why the Add
// Game inputs and the Steam API key input had already drifted apart.

export const FIELD_LABEL =
    'block text-xs font-mono text-text-muted uppercase tracking-wider mb-2'

export const FIELD_INPUT = `
    w-full px-4 py-2.5
    bg-void-surface border border-void-border rounded-lg
    text-text-primary placeholder:text-text-ghost
    focus:outline-none focus:border-crimson-900/50 focus:ring-1 focus:ring-crimson-900/30
    disabled:opacity-40 disabled:cursor-not-allowed
    transition-all duration-200
`

// Paths, arguments and environment variables are all read character by
// character, so they get the mono face.
export const FIELD_INPUT_MONO = `${FIELD_INPUT} font-mono text-sm`

export const FIELD_ADORNMENT =
    'px-3 py-2.5 bg-void-surface border border-void-border rounded-lg text-text-muted hover:text-text-primary transition-colors shrink-0'

export const FIELD_HINT = 'mt-1.5 text-xs text-text-ghost'
