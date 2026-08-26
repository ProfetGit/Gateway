# Gateway

[![CI](https://github.com/ProfetGit/Gateway/actions/workflows/ci.yml/badge.svg)](https://github.com/ProfetGit/Gateway/actions/workflows/ci.yml)

A Linux game launcher for your Steam, Heroic, and Lutris libraries, with a deliberately opinionated OLED-first interface.

Gateway pulls your games together from wherever they already live, adds live catalog data (trending, free-to-keep deals), and tracks achievement progress across all of them — without re-implementing a storefront. Local-first by design: your library lives in a JSON file on disk, covers are mirrored locally, and external APIs only fire when their data is needed.

---

## Screenshots

![Home view — cinematic hero carousel with launch CTA, recently-played strip, and trending row](docs/screenshots/home.png)

![Library view — full grid of owned games with sort, filter, and search](docs/screenshots/library.png)

---

## Features

- **Steam library** — Local-file scan of installed games plus Web-API import of your full owned catalog, including non-Steam shortcuts.
- **Heroic & Lutris import** — Reads both launchers' local libraries so your Epic, GOG, and everything-else games sit in the same grid. Read-only; games still launch through the launcher that owns them.
- **Trending row** — Live data from the Steam featured-categories API, with one-click open in the Steam client.
- **Free-to-Keep deals** — Temporarily-free Steam games via the GamerPower API, with claim-state tracking. Gateway detects when you successfully claim a game and updates the badge automatically.
- **Achievement Hunts** — Cross-game achievement progress with a sortable, filterable drawer (in progress / almost done / completed / untouched / all).
- **Per-game detail** — Banner art, developer info, achievements tab, patch notes (Steam news API), custom launch arguments.
- **Asymmetric cinematic UI** — Custom design system (Crimson Void): OKLCH color palette, Chakra Petch + Red Hat Mono + Archivo Black typography, signature corner-bracket card vocabulary, scanline overlays. No shadcn, no glassmorphism, no purple gradients.

---

## Install

Download the latest `Gateway-x.y.z-x86_64.AppImage` from [Releases](https://github.com/ProfetGit/Gateway/releases), then:

```bash
chmod +x Gateway-*.AppImage
./Gateway-*.AppImage
```

A few things worth knowing:

- **Put it somewhere you can write to**, such as `~/Applications/`. Gateway updates itself by rewriting its own AppImage in place, so if you keep it in `/opt` or `/usr/local/bin` updates will fail. It will tell you when that happens rather than failing quietly.
- **AppImages need FUSE.** On Ubuntu 22.04 and newer that means `sudo apt install libfuse2`. If you would rather not install it, run the AppImage with `--appimage-extract-and-run`.
- **Desktop integration** is not automatic. [AppImageLauncher](https://github.com/TheAssassin/AppImageLauncher) will add it to your menu, or you can write a `.desktop` file yourself.
- **Updates** are checked shortly after launch and downloaded in the background. Gateway installs them when you restart, and the Settings → About panel has a manual check plus a restart-and-install button.

There is no apt or AUR repository, and the AppImage is not signed. If that matters to you, build from source — see Development below.

---

## Requirements

- **Linux, x86-64**, glibc 2.35 or newer (Ubuntu 22.04, Fedora 36, current Arch, or anything newer).
- A **Steam installation** — native, Flatpak, or Snap — for the local library scanner. Optional if you only use Heroic or Lutris.
- **Heroic** and/or **Lutris**, if you want those libraries imported. Neither is required.
- **Wine or Proton** to launch Windows executables added manually.
- A **Steam Web API key** is required for achievement and ownership features. Get one at https://steamcommunity.com/dev/apikey. Without it Gateway still works — Trending, Free Deals, and the local library scanner do not need a key, but Achievement Hunts and "Owned" tagging on trending cards will not populate.

For building from source you will also need **Node.js 18+**, **npm**, and **Git**.

---

## How the launcher integrations work

Gateway reads these libraries; it never writes to them.

- **Heroic** — reads `~/.config/heroic` (and the Flatpak path under `~/.var/app/com.heroicgameslauncher.hgl/`). Picks up Epic, GOG, and sideloaded entries, including games you own but have not installed.
- **Lutris** — runs `lutris --list-games --json`. Note this actually invokes the `lutris` binary on your behalf, which takes a few seconds because Lutris boots its full application to answer. Gateway only does this when you ask it to, never on startup.

Launching hands control back to whichever launcher owns the game, through `heroic://launch/<runner>/<app>` and `lutris:rungameid/<id>`. Gateway does not try to reproduce their runner configuration, Wine prefixes, or per-game tweaks.

Import lives in **Settings → Sources**.

---

## Tech stack

- **Electron 33** (frameless window, custom protocol for local cover assets)
- **React 18** + **TypeScript 5** (renderer)
- **Vite 5** + `vite-plugin-electron` (dev + build)
- **Tailwind CSS 4.0** (CSS-first config via `@tailwindcss/vite`, OKLCH palette)
- **Framer Motion** for entrance/transition animation
- **Zustand** for renderer state, **zod** at the IPC boundary
- **JSON file store** for persistence (`{userData}/gateway-data.json` — no SQL)
- **electron-builder** + **electron-updater** (AppImage, GitHub Releases)

External APIs used: Steam Web API, Steam Store API, Steam featured-categories, GamerPower (free deals).

---

## Development

```bash
# Install
git clone <repo-url>
cd Gateway
npm install

# Run in dev (Vite HMR + Electron auto-reload, devtools auto-open)
npm run dev

# Typecheck only (fast) — note this covers src/ only, not electron/
npx tsc --noEmit

# Lint (max-warnings 0)
npm run lint

# Run tests
npm test

# Package an AppImage locally, without publishing
npm run build

# Build and publish a draft GitHub release (normally CI's job, on a v* tag)
npm run release
```

The dev command boots Vite's dev server and Electron together. Save any renderer file and HMR will update without losing state. Save any `electron/**/*.ts` file and the main process restarts automatically.

Build artifacts:
- `dist/` — renderer bundle
- `dist-electron/` — main + preload bundles
- `release/Gateway-*.AppImage` — the packaged app, plus `latest-linux.yml` for the updater

Auto-update only runs in a packaged build. Under `npm run dev` the updater is skipped deliberately, since it needs to be running as an AppImage to work at all.

---

## Configuration

Gateway stores all user data in the Electron `userData` directory at `~/.config/Gateway/gateway-data.json`.

The file holds your library, settings, and claim state. It is human-readable JSON — you can back it up, edit it, or version-control it.

Steam Web API key entry is in the in-app settings panel. It is stored in the same JSON file.

---

## Project structure

```
electron/                    Main process (Node) + preload bridge
  main.ts                    BrowserWindow boot, gateway:// protocol, handler wiring
  preload.ts                 contextBridge → window.electronBridge (single IPC surface)
  src/
    shared/                  JsonStore, types, per-source merge, cover-mirroring utils
    features/                Per-domain IPC handlers
      steam/                 Trending, free deals, news, store API, local Steam scan
      heroic/                Heroic library scan + import
      lutris/                Lutris library scan + import
      library/               Local library CRUD, launch resolution
      sync/                  Steam sync, multi-source orchestration, claim detection
      achievements/          Achievement definitions + local unlock watching
      updates/               Auto-update wiring
      setup/, notifications/

src/                         Renderer (React)
  App.tsx                    AppShell root — all modal overlays mount here
  lib/                       IPC seam (tauri-client.ts) and cross-cutting wrappers
  stores/                    Cross-cutting Zustand state only
  components/ui/             Zero-domain-knowledge primitives
  features/                  One folder per domain — game-library, home, settings,
                             trending, free-deals, achievement-hunts, auth, onboarding
```

See [`CLAUDE.md`](CLAUDE.md) for a deeper architecture walkthrough — IPC contract, overlay mounting convention, design-system rules, motion grammar, and caching strategy.

---

## Contributing

Contributions welcome. Before opening a PR:

1. Run `npx tsc --noEmit` — typecheck must pass. Be aware it does **not** cover `electron/`; use `npx vite build` to catch main-process breakage.
2. Run `npm run lint` — ESLint runs with `--max-warnings 0`. It also skips `electron/`.
3. Run `npm test`.
4. Run `npx vite build` — production build must succeed.
5. **Linux only.** No `process.platform` branches; there is no Windows or macOS path to keep working.
6. Match the existing design system. The codebase enforces strict rules around color (OKLCH only, no pure black/white), typography (banned font list), and motion (no hover springs, no animated layout properties). See [`CLAUDE.md`](CLAUDE.md) → "Design system (enforced)".
7. Overlays/modals/drawers must mount at `App.tsx` root with state in `game-store` — never in feature trees. The HomeView stacking context will trap nested overlays under the top navigation.

Bug reports and feature requests via GitHub issues. Please include your distro, Electron/Node version, and reproduction steps.

---

## License

[MIT](LICENSE) — fork, modify, and redistribute freely. No warranty.

---

## Acknowledgements

- Game catalog data from the [Steam Store API](https://store.steampowered.com/) and [Steam Web API](https://steamcommunity.com/dev).
- Free-to-keep deal listings from [GamerPower](https://www.gamerpower.com/).
- Library integrations read from [Heroic Games Launcher](https://heroicgameslauncher.com/) and [Lutris](https://lutris.net/).
- Cover art served via Steam CDN; mirrored locally for offline access.

This project is not affiliated with or endorsed by Valve, Epic Games, GOG, Heroic, or Lutris.
