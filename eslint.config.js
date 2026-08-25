import js from '@eslint/js'
import globals from 'globals'
import reactHooks from 'eslint-plugin-react-hooks'
import reactRefresh from 'eslint-plugin-react-refresh'
import tseslint from 'typescript-eslint'
import importPlugin from 'eslint-plugin-import'
import boundaries from 'eslint-plugin-boundaries'
import checkFile from 'eslint-plugin-check-file'

export default tseslint.config(
  { ignores: ['dist', 'node_modules', 'src-tauri/target'] },
  {
    // Root-level tooling config files — outside src/, exempt from the
    // application architecture rules below (Vite/Vitest require a default
    // export from defineConfig, and these aren't part of the feature tree).
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['*.config.ts'],
    languageOptions: { ecmaVersion: 2020, globals: globals.node },
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['src/**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    settings: {
      'boundaries/elements': [
        { type: 'app-root', pattern: 'src', fileMatch: ['App.tsx', 'main.tsx'] },
        { type: 'features', pattern: 'src/features/*', capture: ['domain'] },
        { type: 'ui', pattern: 'src/components/ui/**' },
        { type: 'lib', pattern: 'src/lib/**' },
        { type: 'stores', pattern: 'src/stores/**' },
        { type: 'types', pattern: 'src/types/**' },
      ],
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      import: importPlugin,
      boundaries,
      'check-file': checkFile,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Named exports everywhere except the Vite entry root (App.tsx, exempted below).
      'import/no-default-export': 'error',
      'max-lines': ['error', 200],
      // max-lines-per-function is deliberately NOT enabled: a 60-line cap is
      // incompatible with JSX-heavy React components and Zustand's
      // create((set, get) => ({ ...actions })) factory pattern, both of
      // which are legitimate single "functions" by AST shape but not by any
      // real complexity measure. The 200-line file cap above is the actual
      // enforced ceiling — see CLAUDE.md.
      'check-file/filename-naming-convention': [
        'error',
        {
          '**/*.tsx': 'PASCAL_CASE',
          '**/*.ts': 'KEBAB_CASE',
        },
        { ignoreMiddleExtensions: true },
      ],
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          policies: [
            {
              from: [{ element: { type: 'app-root' } }],
              allow: [
                { to: { element: { type: 'features' } } },
                { to: { element: { type: 'ui' } } },
                { to: { element: { type: 'lib' } } },
                { to: { element: { type: 'stores' } } },
                { to: { element: { type: 'types' } } },
              ],
            },
            {
              from: [{ element: { type: 'features' } }],
              allow: [
                { to: { element: { type: 'ui' } } },
                { to: { element: { type: 'lib' } } },
                { to: { element: { type: 'stores' } } },
                { to: { element: { type: 'types' } } },
                // features/* may not import from another features/* EXCEPT these
                // documented, deliberate cross-domain API-wrapper imports:
                //   - achievements: shared by game-library (per-game tab) and
                //     achievement-hunts (cross-game hunts), confirmed 2 real consumers
                //   - auth: steam-login/has-steam-api-key also consumed by onboarding
                { to: { element: { type: 'features', captured: { domain: 'achievements' } } } },
                { to: { element: { type: 'features', captured: { domain: 'auth' } } } },
              ],
            },
            { from: [{ element: { type: 'ui' } }], allow: [{ to: { element: { type: 'ui' } } }, { to: { element: { type: 'lib' } } }] },
            { from: [{ element: { type: 'lib' } }], allow: [{ to: { element: { type: 'lib' } } }] },
            { from: [{ element: { type: 'stores' } }], allow: [{ to: { element: { type: 'stores' } } }, { to: { element: { type: 'lib' } } }, { to: { element: { type: 'types' } } }] },
            { from: [{ element: { type: 'types' } }], allow: [{ to: { element: { type: 'types' } } }] },
          ],
        },
      ],
    },
  },
  {
    // Vite's entry-root component is the one legitimate default export.
    files: ['src/App.tsx'],
    rules: { 'import/no-default-export': 'off' },
  },
  {
    // Vite/Vitest entry points — lowercase by long-standing convention
    // (index.tsx-style), not part of the feature naming scheme.
    files: ['src/main.tsx', 'src/vite-env.d.ts'],
    rules: { 'check-file/filename-naming-convention': 'off' },
  },
)
