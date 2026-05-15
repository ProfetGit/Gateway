# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm run dev          # vite dev server + electron auto-reload, devtools auto-opens
npm run build        # tsc → vite build → electron-builder (full installer)
npx vite build       # renderer + main + preload bundles only (fast verify)
npx tsc --noEmit     # typecheck-only, no emit
npm run lint         # eslint, max-warnings 0
npm run preview      # preview built renderer
```

No test runner is wired up despite `vitest` being installed. There is no `npm test` script and no `*.test.ts` files.

## Architecture

### Two-process layout

```
electron/                  → main process (Node) + preload bridge
  main.ts                  → BrowserWindow boot, registers gateway:// protocol, wires feature handlers
  preload.ts               → contextBridge → window.api (the ONLY IPC surface for renderer)
  steamAuth.ts             → Steam OpenID flow + API key storage
  src/
    shared/store.ts        → JsonStore: persists to {userData}/gateway-data.json (no SQL despite better-sqlite3 dep)
    features/              → per-domain IPC handlers, each exports setupXxxHandlers() called from main.ts
      steam/               → Steam Store + Web API (trending, free deals, achievements, news)
      library/             → CRUD on local library
      sync/                → Steam sync + claim-detection on window-focus

src/                       → renderer (React 18 + Vite)
  App.tsx                  → AppShell root: all modal overlays mount HERE, not in feature trees
  stores/                  → Zustand. gameStore is the spine; others are scoped (achievements, contextMenu, uiStore)
  components/              → shared/layout/auth/game UI
  features/                → home-page sections (trending, free-deals, achievement-hunts)
```

### IPC contract

`electron/preload.ts` is the single source of truth for the renderer-visible API. Adding any main-process capability requires:
1. Implement handler with `ipcMain.handle(...)` in a `features/*/xxx-ipc.ts` file
2. Call its `setupXxxHandlers()` from `electron/main.ts`
3. Expose via `contextBridge` in `preload.ts`
4. The renderer calls `window.api.xxx()` — never `ipcRenderer` directly

External web APIs (Steam Store, GamerPower) **must** go through main process — CORS would block them in the renderer.

### Overlay / modal convention (load-bearing)

All drawers, modals, and overlays (`GameDetail`, `SettingsPanel`, `AddGameModal`, `ContextMenu`, `AchievementHuntsDrawer`) mount at the **AppShell root** in `App.tsx`. Their visibility state lives in `gameStore` (`isSettingsOpen`, `isHuntsDrawerOpen`, etc.). Open-actions mutually-exclude other overlays via `set({ ..., isOtherX: false })`.

Reason: `HomeView` wraps content in `relative z-10`, which creates a stacking context that **traps** the z-index of any `position: fixed` element rendered inside it. A drawer rendered from a deeply-nested feature component will appear *below* `TopNavigation` (z-30 at root) regardless of its own z-index. New overlays must follow this pattern.

### Local-first data flow

- Library lives in `{userData}/gateway-data.json` (`JsonStore`). All game CRUD goes through it.
- Steam cover art is mirrored locally and served via the `gateway://` custom protocol. `Game.localCoverPath` is preferred; `coverUrl` (Steam CDN) is fallback in `<img onError>` chains.
- External API responses are cached:
  - Steam trending: 10-min main-process cache + in-flight dedup
  - Achievements: 24h renderer cache in `useAchievementsStore`, 5-parallel concurrency-bounded fetch
  - Non-eligible games (private profile / no achievements / errors) are cached too — prevents re-hammering on every mount

### Game sources

`Game.source` is one of `'manual' | 'steam'`. Steam-specific operations (achievements, news, hero images, store links) gate on `game.steamAppId` being present. Target platform is Windows only — Linux launch wrappers (Gamescope, MangoHud, Feral GameMode) are not part of the product surface.

## Design system (enforced)

### Tailwind v4 (CSS-first config)

This repo is on **Tailwind v4**. Theme tokens live in `@theme { ... }` at the top of `src/index.css` — there is **no `tailwind.config.js`**. Build is wired via the `@tailwindcss/vite` plugin in `vite.config.ts` (PostCSS + autoprefixer are gone; v4 handles vendor prefixing internally via Lightning CSS).

Conventions specific to v4 in this codebase:
- Palette tokens are flat OKLCH **without** the `<alpha-value>` placeholder — v4 resolves `bg-crimson-500/40` through `color-mix()` automatically, so the placeholder isn't needed.
- Theme variables are exposed as real CSS custom properties (`--color-crimson-500`, `--shadow-crimson-glow`, `--ease-out-expo`, `--animate-heartbeat`). Use `var(--color-...)` inside raw CSS instead of v3's `theme('colors.x.y')` — the v3 `theme()` helper is gone for `@apply` bodies.
- Animations are registered as `--animate-foo: foo 2s ...;` in `@theme`. Tailwind generates the `animate-foo` utility from that token; the `@keyframes foo` block lives below the `@theme` block.
- The default border color in v4 changed from `gray-200` to `currentColor`. We pin it back to `--color-void-border` in a base layer so existing borders don't all flip red.

### Color: OKLCH only, alpha-aware

All palette tokens are `oklch(L C H)`. **Never add hex literals to the system** — only Steam brand color `#1b2838` in `SteamLogin.tsx` is exempt (third-party brand identity).

Pure `#000` / `#fff` are banned. `--color-white` and `--color-black` are **overridden** to tinted OKLCH equivalents, so `text-white` / `bg-black` still resolve correctly without violating the rule.

### Fonts

- Display: **Chakra Petch** (`font-display`)
- Mono: **Red Hat Mono** (`font-mono`)
- Accent: **Archivo Black** via `font-etched` or `.text-etched` class

Banned forever: Inter, JetBrains Mono, Roboto, Geist, Space Grotesk, DM Sans, IBM Plex *, Syne, Playfair Display, and the rest of the AI-tell list. See prior session context — these are signature-design-skill rules.

### Motion

- Hover transitions: **100ms `ease-out-expo`** (`cubic-bezier(0.16, 1, 0.3, 1)`). Springs on hover are banned — use them only for entrance/one-shot reveals.
- Never animate `width` / `height` / `padding` / `margin`. Progress bars use `scaleX` with `transform-origin: left`. Corner-bracket reveals use opacity + scale, never `w-0 → w-6`.
- Layout-shift on hover (image scale, etc.) must be `transform: scale(...)`, not size changes.

### Card primitives & vocabulary

Three card primitives share a vocabulary but serve distinct purposes — don't merge them:
- `GameCard` (3:4 cover, hexagon play button) — library grid
- `StoreCard` (460:215 banner, accent prop) — Trending + FreeDeals
- `AchievementHuntCard` (5:4 dim-cover backdrop + huge italic %) — Achievement Hunts

Shared vocabulary: corner-bracket hovers, scanline overlays, `bg-black/70 backdrop-blur-sm` dark-glass badges, mono caps tracking, void-surface borders.

**Important**: `aspect-[X/Y]` Tailwind arbitrary class does not reliably hold height inside `<motion.button>` with `flex flex-col`. Use inline `style={{ aspectRatio: 'X / Y' }}` instead — StoreCard and AchievementHuntCard both do this.

### Carousel pattern

Horizontal carousels (Trending, FreeDeals) use the shared `useHorizontalScroller` hook + `CarouselNav` component (both in `src/components/shared/`). Each section's header has a left zone (animated icon + title + live-pill) and a right zone for the nav arrows. Cards inside carousels have `snap-start scroll-ml-10` to land on boundaries when arrow-scrolled.

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
- **Section auto-hide**: TrendingSection, FreeDealsSection, and AchievementHuntsSection all return `null` if their data is missing or empty. Mounting them is cheap; populating them is conditional.
- **Steam claim tracking**: When user clicks a free deal, `openSteamStoreClaim` records the appId. On window-focus return, main process checks `checkPendingClaims` and emits `'game-claimed'` IPC if the user now owns it. FreeDealsSection listens via `onGameClaimed`.
