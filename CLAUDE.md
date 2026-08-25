# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # tauri dev — launches the native window, Vite dev server behind it
npm run dev:vite      # vite dev server only (renderer-only, no Tauri backend — IPC calls will fail)
npm run build         # tauri build — full installer
npm run build:vite    # tsc → vite build (renderer-only bundle, fast verify)
npx tsc --noEmit      # typecheck-only, no emit
npm run lint          # eslint flat config, max-warnings 0
npm run check:secrets # grep gate for leaked API keys/tokens, run in CI
npm run preview       # preview built renderer
npm test              # vitest run — test runner IS wired, see src/features/*/*.test.ts
```

## Architecture

### Two-process layout (Tauri 2.0)

```
src-tauri/                 → Rust backend — plays the "server" role: Steam auth/OpenID,
  src/                        Steam Web API calls, local JSON store, file I/O
    commands/               → #[tauri::command] handlers, one module per concern
                               (library, setup, steam_api, sync)
    steam_auth.rs           → Steam OpenID flow + API key storage
    store.rs                → JSON persistence to the Tauri app-data dir
  capabilities/            → ACL — which commands the renderer may invoke

src/                       → renderer (React 18 + Vite)
  App.tsx                  → AppShell root: all modal overlays mount HERE, not in feature trees
  lib/
    tauri-client.ts        → re-exports invoke/listen from @tauri-apps/api — every api/*.ts
                               file imports from here, not the package directly
    api/                   → cross-cutting IPC wrappers with no single owning domain
                               (file-dialogs, navigation, setup-state)
  components/ui/           → zero-domain-knowledge primitives (cards, context-menu, controls)
  features/                → one folder per business domain (see Placement algorithm below)
  stores/                  → cross-cutting Zustand state only (ui-store). Domain-scoped
                               stores (game-store, achievements-store) live inside their
                               owning feature.
```

### IPC contract

`src/lib/tauri-client.ts` is the single choke point for `invoke`/`listen` — every domain's `api/*.ts` file imports from there, never from `@tauri-apps/api` directly. Adding any backend capability requires:
1. Implement a `#[tauri::command]` in `src-tauri/src/commands/`
2. Register it in the Tauri builder (`src-tauri/src/lib.rs`) and its capability in `src-tauri/capabilities/`
3. Add a typed wrapper in the owning domain's `features/<domain>/api/<verb-noun>.ts` — one file per function — that parses the result through a zod schema in that domain's `<domain>-schema.ts` before returning
4. The renderer calls the named function from a component/hook — never `invoke()` directly from a component

External web APIs (Steam Store, GamerPower) go through the Rust backend — this is unchanged from the pre-Tauri architecture and avoids CORS in the renderer.

### Directory structure & placement algorithm

This is a Vite SPA with **no router** (see Overlay convention below — the overlay/view-boolean model in `game-store` fills the role a router would otherwise play). The placement algorithm is adapted accordingly. Run this for every new file, first match wins:

1. Used by exactly one feature domain → `features/<domain>/` (`components/` for UI, `api/` for IPC wrappers, domain-types file at the top level of the folder)
2. Cross-domain, zero business/domain knowledge → `components/ui/`
3. Cross-domain, pure logic, no React import, no single owning domain → `lib/`
4. Genuinely cross-cutting client state (not server data) → `stores/`
5. None of the above → stop, this is a real ambiguity, don't guess a new top-level folder

**Documented cross-feature-import exemptions** (encoded in `eslint.config.js`'s `boundaries/dependencies` rule — `features/*` may not import from another `features/*` except these two, each has a real second consumer, not a hypothetical one):
- `features/achievements/` — API-only micro-domain (`get-achievements.ts` + schema), no UI of its own. Imported by `features/game-library/` (the per-game achievements tab) and `features/achievement-hunts/` (the cross-game hunts drawer/section, via `achievements-store.ts`). These are two distinct product concepts sharing one backend call — don't conflate "achievements" (this micro-domain) with "achievement-hunts" (the hunts feature).
- `features/auth/` — `steam-login.ts` and `has-steam-api-key.ts` are also imported by `features/onboarding/`, since the first-run flow needs to trigger login before the dedicated Settings/Account UI exists.

Everything else that looks cross-cutting but isn't feature-owned (Steam Store link-outs used by 3+ domains, generic file-picker dialogs, app-wide setup-state gating read directly by `App.tsx`) lives in `lib/api/` — this is the category a Next.js `app/_lib` tier would normally catch, and Gateway has no such tier.

### Overlay / modal convention (load-bearing)

All drawers, modals, and overlays (`GameDetail`, `SettingsPanel`, `AddGameModal`, `ContextMenu`, `AchievementHuntsDrawer`) mount at the **AppShell root** in `App.tsx`. Their visibility state lives in `game-store` (`isSettingsOpen`, `isHuntsDrawerOpen`, etc.). Open-actions mutually-exclude other overlays via `set({ ..., isOtherX: false })`.

Reason: `HomeView` wraps content in `relative z-10`, which creates a stacking context that **traps** the z-index of any `position: fixed` element rendered inside it. A drawer rendered from a deeply-nested feature component will appear *below* `TopNavigation` (z-30 at root) regardless of its own z-index. New overlays must follow this pattern.

This is also, functionally, Gateway's routing layer — there is no router, and this convention is not a placeholder for one; it's the deliberate final design.

### Server state: zod + react-query, client state: Zustand

- Each domain's IPC wrapper (`features/<domain>/api/<verb-noun>.ts`) parses its `invoke()` result through a zod schema from that domain's `<domain>-schema.ts` before returning — this is the actual IPC-boundary validation, replacing blind trust in whatever the Rust side returns.
- `@tanstack/react-query`'s `QueryClientProvider` wraps the app in `main.tsx`. Query keys follow `[domain, resource, ...params]` (e.g. `['game-library', 'games']`). **Adoption is partial**: the convention is established (see `features/game-library/api/use-games-query.ts`) but most fetches still use the original `useEffect` + raw wrapper pattern — converting a call site to a query/mutation hook is safe to do incrementally, one component at a time.
- `game-store.ts` keeps **all** overlay-boolean/view/selection/filter state exactly as before — react-query only ever replaces the *fetching* half of a flow, never the UI-state half. This is the easiest thing to get backwards; if you're touching `isDetailOpen` or `currentView`, you're in Zustand territory, not react-query's.

### Local-first data flow

- Library persists via the Rust backend's JSON store (`src-tauri/src/store.rs`). All game CRUD goes through `features/game-library/api/`.
- Steam cover art is mirrored locally and served via the `gateway://` custom protocol. `Game.localCoverPath` is preferred; `coverUrl` (Steam CDN) is fallback in `<img onError>` chains.
- External API responses are cached:
  - Steam trending: 10-min main-process cache + in-flight dedup (backend-side)
  - Achievements: 24h renderer cache in `achievements-store.ts` (`features/achievement-hunts/`), 5-parallel concurrency-bounded fetch
  - Non-eligible games (private profile / no achievements / errors) are cached too — prevents re-hammering on every mount

### Game sources

`Game.source` is one of `'manual' | 'steam'`. Steam-specific operations (achievements, news, hero images, store links) gate on `game.steamAppId` being present. Target platform is Windows only — Linux launch wrappers (Gamescope, MangoHud, Feral GameMode) are not part of the product surface.

## Design system (enforced)

### Tailwind v4 (CSS-first config)

This repo is on **Tailwind v4**. There is **no `tailwind.config.js`**. Build is wired via the `@tailwindcss/vite` plugin in `vite.config.ts` (PostCSS + autoprefixer are gone; v4 handles vendor prefixing internally via Lightning CSS).

Design tokens are split across three files in `src/styles/`, in strict layer order:
- `theme-primitives.css` — raw palette (`--void-*`, `--crimson-*`, `--ember-*`, `--emerald-500`, `--white`/`--black`), no `--color-` prefix, never Tailwind-utility-generating on their own, never referenced directly by a component.
- `theme-semantic.css` — role-named tokens (`--text-primary/secondary/muted/ghost`, `--brand-primary`, `--status-installed`), referencing primitives or their own literals. This is the layer a future `.dark` override would redefine — none exists today, Gateway is single-theme OLED dark by design.
- `theme.css` — the `@theme inline { ... }` **mapping** layer, imported by `src/index.css`. `inline` (not plain `@theme`) is mandatory: it emits `background-color: var(--color-x)` directly into each utility so the token resolves at the consuming element, not frozen at `:root` — the property that makes "change one line, repaint everything" hold even inside a future nested `.dark`. Fonts/shadows/easing/blur/`--animate-*` have no semantic layer to add and are declared here directly as literals.

Conventions specific to v4 in this codebase:
- Palette tokens are flat OKLCH **without** the `<alpha-value>` placeholder — v4 resolves `bg-crimson-500/40` through `color-mix()` automatically.
- Use `var(--color-...)` inside raw CSS instead of v3's `theme('colors.x.y')` — the v3 `theme()` helper is gone for `@apply` bodies.
- Animations are registered as `--animate-foo: foo 2s ...;` inside the `theme.css` mapping layer. Tailwind generates the `animate-foo` utility from that token; the `@keyframes foo` blocks live in `src/index.css`.
- The default border color in v4 changed from `gray-200` to `currentColor`. We pin it back to `--color-void-border` in a base layer so existing borders don't all flip red.

### Color: OKLCH only, alpha-aware

All palette tokens are `oklch(L C H)`. **Never add hex literals to the system** — only Steam brand color `#1b2838` in `SteamLogin.tsx` is exempt (third-party brand identity).

Pure `#000` / `#fff` are banned. `--white` and `--black` primitives are tinted OKLCH equivalents, mapped to `--color-white`/`--color-black`, so `text-white` / `bg-black` still resolve correctly without violating the rule.

**Deliberate deviation from a pure primitive/semantic split**: components in this codebase use primitive-tier classes directly (`bg-void-surface`, `text-crimson-500`, etc.) — the crimson/void/ember scale IS the design vocabulary here (see `.void-card`, `.crimson-glow` in `index.css`'s `@layer components`), not a forbidden implementation detail. Only the NEW semantic tokens (`text-primary`, `brand-primary`, `status-installed`) are meant to layer on top for role-based usage going forward. Don't attempt to purge existing primitive-class usage — that would be a large, separate, unapproved change.

### Fonts

- Display: **Chakra Petch** (`font-display`)
- Mono: **Red Hat Mono** (`font-mono`)
- Accent: **Archivo Black** via `font-etched` or `.text-etched` class

Banned forever: Inter, JetBrains Mono, Roboto, Geist, Space Grotesk, DM Sans, IBM Plex *, Syne, Playfair Display, and the rest of the AI-tell list.

### Motion

- Hover transitions: **100ms `ease-out-expo`** (`cubic-bezier(0.16, 1, 0.3, 1)`). Springs on hover are banned — use them only for entrance/one-shot reveals.
- Never animate `width` / `height` / `padding` / `margin`. Progress bars use `scaleX` with `transform-origin: left`. Corner-bracket reveals use opacity + scale, never `w-0 → w-6`.
- Layout-shift on hover (image scale, etc.) must be `transform: scale(...)`, not size changes.

### Card primitives & vocabulary

Three card primitives share a vocabulary but serve distinct purposes — don't merge them:
- `GameCard` (3:4 cover, hexagon play button) — `features/game-library/components/`, library grid
- `StoreCard` (460:215 banner, accent prop) — `components/ui/cards/`, used by Trending + FreeDeals
- `AchievementHuntCard` (5:4 dim-cover backdrop + huge italic %) — `components/ui/cards/`, Achievement Hunts

`StoreCard` and `AchievementHuntCard` live in `components/ui/cards/` (not a feature) — both are pure-props components with zero domain-store reads and 3+ real consumers across features, which is what justifies cross-domain placement per the algorithm above.

Shared vocabulary: corner-bracket hovers, scanline overlays, `bg-black/70 backdrop-blur-sm` dark-glass badges, mono caps tracking, void-surface borders.

**Important**: `aspect-[X/Y]` Tailwind arbitrary class does not reliably hold height inside `<motion.button>` with `flex flex-col`. Use inline `style={{ aspectRatio: 'X / Y' }}` instead — `StoreCard` and `AchievementHuntCard` both do this.

### Carousel pattern

Horizontal carousels (Trending, FreeDeals) use the shared `use-horizontal-scroller` hook + `CarouselNav` component (both in `src/components/ui/`). Each section's header has a left zone (animated icon + title + live-pill) and a right zone for the nav arrows. Cards inside carousels have `snap-start scroll-ml-10` to land on boundaries when arrow-scrolled.

## Conventions worth knowing

- **Voice**: outcome-verb buttons ("Launch", "Install", "Claim"), no marketing fluff. Banned: "Get Started", "Unlock Your", "Supercharge", "delightful", "seamlessly", etc.
- **No technical / sci-fi jargon in user-facing strings.** This is a gaming app for normal players, not a sysadmin tool. The brutalist visual style is fine; the *copy* must read like a person, not a terminal. Banned words/phrases in any rendered label, header, badge, placeholder, alert, or empty-state message:
  - **System-speak**: "System Settings", "Gateway OS", "System Ready", "Uplink", "Network", "Connect to Steam Network", "First Run", "STATUS:", "SOURCE:".
  - **Data-speak**: "Database", "Local Database", "Purge", "Metadata", "Manifest", "Cache", "Local cache from remote", "Backup library manifest", "Sync local cache".
  - **Process-speak**: "ENTRY", "NEW ENTRY", "H LOGGED" (use "hours played"), "Synchronize game data", "Fetch", "Endpoint".
  - **Dev/jargon in product copy**: terminal-speak ("nested compositor", "CPU governor optimization", "profile fallback", "subprocess", "stdout") never appears in user-facing strings. Plain English only.
  - **SHOUTING acronyms**: "CANNOT LOAD X", "NO X" — use sentence case ("Couldn't load X", "No X yet").
  Replacements lean on outcome-verb phrasing: "Refresh Library" not "Sync local cache from remote"; "Save to File" not "Export library manifest"; "Not signed in" not "No Uplink Detected"; "Clear Library" not "Purge Local Database"; "Couldn't load achievements" not "CANNOT LOAD ACHIEVEMENTS". `font-mono uppercase tracking-widest` is a *visual* treatment — apply it to plain words, don't use it as license for jargon.
- **State design**: empty/error/loading are designed surfaces, not text fallbacks. Skeletons (shimmer animation) over spinners. Section auto-hides when empty rather than rendering placeholder shells.
- **Section auto-hide**: `TrendingSection`, `FreeDealsSection`, and `AchievementHuntsSection` all return `null` if their data is missing or empty. Mounting them is cheap; populating them is conditional.
- **Steam claim tracking**: When user clicks a free deal, `openSteamStoreClaim` (`features/free-deals/api/`) records the appId. On window-focus return, the Rust backend checks pending claims and emits a `game-claimed` event if the user now owns it. `FreeDealsSection` listens via `onGameClaimed` (`features/free-deals/api/on-game-claimed.ts`).

## Naming (enforced)

- React components: `PascalCase.tsx`, filename identical to the component name.
- Everything else: `kebab-case.ts` — hooks, stores, api wrappers, schemas, types.
- No barrel files (`index.ts` re-exports) anywhere — import the real path. `eslint-plugin-boundaries` + the placement algorithm above make this enforceable without them.
- Named exports everywhere except `src/App.tsx` (the Vite entry root — `import/no-default-export` is explicitly overridden for this one file in `eslint.config.js`) and `src/main.tsx`/`vite-env.d.ts` (framework-required, filename-case rule overridden).
- Path alias `@/*` → `src/*` (configured in `tsconfig.json` and `vite.config.ts`). Relative imports only within the same folder; cross-folder imports always use the alias.
- Hard file-length ceiling: 200 lines (`max-lines` error in `eslint.config.js`). Files in the 150–200 range are worth reviewing for a split but aren't forced. `max-lines-per-function` is deliberately NOT enabled — a 60-line cap is incompatible with JSX-heavy React components and Zustand's `create((set, get) => ({...}))` factory pattern.
