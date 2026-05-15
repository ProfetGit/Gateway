# Gateway

A unified game launcher for Steam, Lutris, and Heroic libraries, with a deliberately opinionated OLED-first interface.

Gateway aggregates your games from multiple sources, surfaces live Steam catalog data (trending, free-to-keep deals), and tracks achievement progress across your entire library — without re-implementing a storefront. Local-first by design: your library lives in a JSON file on disk, covers are mirrored locally, and external APIs only fire when their data is needed.

---

## Features

- **Library aggregation** — Steam (via local file scan), Lutris, and Heroic Games Launcher in one view. Manual entries supported.
- **Trending row** — Live data from the Steam featured-categories API, with one-click open in the Steam client.
- **Free-to-Keep deals** — Temporarily-free Steam games via the GamerPower API, with claim-state tracking. Gateway detects when you successfully claim a game and updates the badge automatically.
- **Achievement Hunts** — Cross-game achievement progress with a sortable, filterable drawer (in progress / almost done / completed / untouched / all).
- **Per-game detail** — Banner art, developer info, achievements tab, patch notes (Steam news API), launch options including Gamescope, MangoHud, GameMode, custom env vars, and VDF-serialized Steam launch flags.
- **Asymmetric cinematic UI** — Custom design system (Crimson Void): OKLCH color palette, Chakra Petch + Red Hat Mono + Archivo Black typography, signature corner-bracket card vocabulary, scanline overlays. No shadcn, no glassmorphism, no purple gradients.

---

## Tech stack

- **Electron 30** (frameless window, custom protocol for local cover assets)
- **React 18** + **TypeScript 5** (renderer)
- **Vite 5** + `vite-plugin-electron` (dev + build)
- **Tailwind CSS 3.4** with OKLCH `<alpha-value>` palette
- **Framer Motion** for entrance/transition animation
- **Zustand** for renderer state
- **JSON file store** for persistence (`{userData}/gateway-data.json` — no SQL)

External APIs used: Steam Web API, Steam Store API, Steam featured-categories, GamerPower (free deals).

---

## Requirements

- **Node.js 18+** and **npm**
- **Git**
- A working **Steam installation** is required for the Steam library scanner to find local games.
- Optional: **Lutris** (Linux) and/or **Heroic Games Launcher** if you want those sources included.
- A **Steam Web API key** is required for achievement and ownership features. Get one at https://steamcommunity.com/dev/apikey. Without it, Gateway still works — Trending, Free Deals, and the local library scanner do not need a key, but Achievement Hunts and "Owned" tagging on trending cards will not populate.

---

## Development

```bash
# Install
git clone <repo-url>
cd Gateway
npm install

# Run in dev (Vite HMR + Electron auto-reload, devtools auto-open)
npm run dev

# Typecheck only (fast)
npx tsc --noEmit

# Lint (max-warnings 0)
npm run lint

# Build production binaries (electron-builder)
npm run build
```

The dev command boots Vite's dev server and Electron together. Save any renderer file and HMR will update without losing state. Save any `electron/**/*.ts` file and the main process restarts automatically.

Build artifacts:
- `dist/` — renderer bundle
- `dist-electron/` — main + preload bundles
- `release/` — packaged installers (after `npm run build`)

---

## Configuration

Gateway stores all user data in the Electron `userData` directory:

| Platform | Path |
|---|---|
| Windows | `%APPDATA%\Gateway\gateway-data.json` |
| macOS | `~/Library/Application Support/Gateway/gateway-data.json` |
| Linux | `~/.config/Gateway/gateway-data.json` |

The file holds your library, settings, and claim state. It is human-readable JSON — you can back it up, edit it, or version-control it.

Steam Web API key entry is in the in-app settings panel. It is stored in the same JSON file.

---

## Project structure

```
electron/                    Main process (Node) + preload bridge
  main.ts                    BrowserWindow boot, gateway:// protocol, handler wiring
  preload.ts                 contextBridge → window.api (single IPC surface)
  src/
    shared/                  JsonStore, types, constants, cover-mirroring utils
    features/                Per-domain IPC handlers
      steam/                 Trending, free deals, achievements, news, store API
      library/               Local library CRUD
      sync/                  Steam sync + claim-detection
      lutris/, heroic/       External launcher scanners

src/                         Renderer (React)
  App.tsx                    AppShell root — all modal overlays mount here
  stores/                    Zustand stores (gameStore is the spine)
  components/                Shared UI primitives, layout, auth, game cards
  features/                  Home-page sections (trending, free-deals, achievement-hunts)
```

See [`CLAUDE.md`](CLAUDE.md) for a deeper architecture walkthrough — IPC contract, overlay mounting convention, design-system rules, motion grammar, and caching strategy.

---

## Contributing

Contributions welcome. Before opening a PR:

1. Run `npx tsc --noEmit` — typecheck must pass
2. Run `npm run lint` — ESLint runs with `--max-warnings 0`
3. Run `npx vite build` — production build must succeed
4. Match the existing design system. The codebase enforces strict rules around color (OKLCH only, no pure black/white), typography (banned font list), and motion (no hover springs, no animated layout properties). See [`CLAUDE.md`](CLAUDE.md) → "Design system (enforced)".
5. Overlays/modals/drawers must mount at `App.tsx` root with state in `gameStore` — never in feature trees. The HomeView stacking context will trap nested overlays under the top navigation.

Bug reports and feature requests via GitHub issues. Please include OS, Electron/Node version, and reproduction steps.

---

## License

[MIT](LICENSE) — fork, modify, and redistribute freely. No warranty.

---

## Acknowledgements

- Game catalog data from the [Steam Store API](https://store.steampowered.com/) and [Steam Web API](https://steamcommunity.com/dev).
- Free-to-keep deal listings from [GamerPower](https://www.gamerpower.com/).
- Cover art served via Steam CDN; mirrored locally for offline access.
- Library import support for [Lutris](https://lutris.net/) and [Heroic Games Launcher](https://heroicgameslauncher.com/).

This project is not affiliated with or endorsed by Valve, Lutris, or Heroic.
