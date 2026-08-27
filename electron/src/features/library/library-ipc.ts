import fs from 'node:fs'
import os from 'node:os'
import { ipcMain, shell, dialog, BrowserWindow } from 'electron'
import { v4 as uuidv4 } from 'uuid'
import { JsonStore } from '../../shared/store'
import { Game } from '../../shared/types'
import { downloadGameArt } from '../../shared/utils'
import {
    resolveLaunch,
    UMU_COMMAND,
    WINE_COMMAND,
    GAMEMODE_COMMAND,
    MANGOHUD_COMMAND,
    type LaunchPlan,
} from './resolve-launch'
import { canResetPrefix } from './can-reset-prefix'
import { detectLaunchTools, listProtonBuilds } from './detect-launch-tools'
import { prefixPathFor, readLaunchSettings, type LaunchSettings } from './launch-settings'
import { inspectPrefix } from './scan-prefix-executables'
import { cancelWindowsInstaller, runWindowsInstaller, type RunInstallerOptions } from './windows-installer'

// A missing binary is the single most common way a Windows game fails to
// start, and the message has to name the package — "spawn ENOENT" tells a
// player nothing. Keyed by the command that actually failed: spawn reports
// ENOENT for the head of the chain only, never for an argument.
const MISSING_COMMAND_HINT: Record<string, string> = {
    [UMU_COMMAND]: "umu-run isn't installed. Install the umu-launcher package to run Windows games.",
    [WINE_COMMAND]: "Wine isn't installed. Install the wine package to run Windows games.",
    [GAMEMODE_COMMAND]: "GameMode isn't installed. Install the gamemode package, or turn GameMode off for this game.",
    [MANGOHUD_COMMAND]: "MangoHud isn't installed. Install the mangohud package, or turn MangoHud off for this game.",
}

function describeSpawnFailure(
    plan: Extract<LaunchPlan, { kind: 'spawn' }>,
    error: NodeJS.ErrnoException
): string {
    if (error.code === 'ENOENT') {
        return MISSING_COMMAND_HINT[plan.command] ?? 'That file is missing — check the game file path.'
    }
    if (error.code === 'EACCES') return 'That file is not marked executable.'
    return error.message
}

/**
 * Resolve once the process is actually running, reject if it never started.
 *
 * The old code returned success before either could happen, so a missing
 * binary or a bad path was a button click that did nothing at all. We
 * deliberately do NOT wait for exit — that is the game running.
 */
function spawnDetached(plan: Extract<LaunchPlan, { kind: 'spawn' }>): Promise<void> {
    return new Promise((resolve, reject) => {
        import('child_process')
            .then(({ spawn }) => {
                const proc = spawn(plan.command, plan.args, {
                    env: plan.env,
                    detached: true,
                    stdio: 'ignore',
                })
                proc.on('error', reject)
                proc.on('spawn', () => {
                    proc.unref()
                    resolve()
                })
            })
            .catch(reject)
    })
}

export function setupLibraryHandlers(store: JsonStore, getMainWindow: () => BrowserWindow | null) {
    // Game CRUD operations
    ipcMain.handle('get_games', () => {
        return store.get('games')
    })

    ipcMain.handle('add_game', (_event, { game: gameData }: { game: Omit<Game, 'id'> }) => {
        const games = store.get('games')
        const newGame: Game = {
            ...gameData,
            id: uuidv4(),
        }
        games.push(newGame)
        store.set('games', games)
        return newGame
    })

    ipcMain.handle('update_game', (_event, { id, updates }: { id: string; updates: Partial<Game> }) => {
        const games = store.get('games')
        const index = games.findIndex(g => g.id === id)
        if (index !== -1) {
            const merged = { ...games[index], ...updates } as Game
            // An explicit `undefined` means "clear this field" (e.g. removing a
            // Steam match). Spreading leaves the key present-but-undefined,
            // which JSON.stringify would drop silently on write but which keeps
            // the stale value visible in the object returned to the renderer.
            for (const key of Object.keys(updates) as Array<keyof Game>) {
                if (updates[key] === undefined) delete merged[key]
            }
            games[index] = merged
            store.set('games', games)
            return games[index]
        }
        throw new Error('Game not found')
    })

    ipcMain.handle('delete_game', (_event, { id }: { id: string }) => {
        const games = store.get('games')
        store.set('games', games.filter(g => g.id !== id))
    })

    // Uninstall game
    ipcMain.handle('uninstall_game', async (_event, { game }: { game: Game }) => {
        if (game.steamAppId) {
            await shell.openExternal(`steam://uninstall/${game.steamAppId}`)
            return { success: true }
        }
        return { success: false, error: 'Uninstall not supported for this game type' }
    })

    // Launch game
    ipcMain.handle('launch_game', async (_event, { game }: { game: Game }) => {
        // Target resolution lives in resolve-launch.ts so it can be unit-tested.
        const plan = resolveLaunch(game, process.env, detectLaunchTools().umu)

        if (plan.kind === 'none') {
            console.warn('[Library] Nothing to launch for', game.title, '—', plan.reason)
            return { success: false, error: plan.reason }
        }

        if (plan.kind === 'uri') {
            await shell.openExternal(plan.uri)
        } else {
            console.log('[Library] Launching', game.title, 'via', plan.runner, '—', plan.command, plan.args)
            try {
                await spawnDetached(plan)
            } catch (error) {
                const message = describeSpawnFailure(plan, error as NodeJS.ErrnoException)
                console.error('[Library] Failed to launch', game.title, '—', error)
                return { success: false, error: message }
            }
        }

        // Only after something actually launched — this used to run even when
        // the game had no launch target at all, and then even when the spawn
        // failed outright.
        const games = store.get('games')
        const target = games.find(g => g.id === game.id)
        if (target) {
            target.lastPlayed = new Date().toISOString()
            store.set('games', games)
        }

        return { success: true }
    })

    // Open URL in default browser
    ipcMain.handle('open_url', async (_event, { url }: { url: string }) => {
        console.log('[Main] Opening URL:', url)
        await shell.openExternal(url)
    })

    // Open Steam store page in Steam app
    ipcMain.handle('open_steam_store', async (_event, { appId }: { appId: string }) => {
        console.log('[Main] Opening Steam store for appId:', appId)
        await shell.openExternal(`steam://store/${appId}`)
    })

    // Install a Steam game (opens Steam install dialog)
    ipcMain.handle('install_steam_game', async (_event, { appId }: { appId: string }) => {
        await shell.openExternal(`steam://install/${appId}`)
    })

    // File dialogs
    ipcMain.handle('select_executable', async () => {
        const win = getMainWindow()
        if (!win) return null
        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile'],
            filters: [
                { name: 'Executables', extensions: ['exe', 'sh', 'AppImage', ''] },
                { name: 'All Files', extensions: ['*'] },
            ],
        })
        return result.canceled ? null : result.filePaths[0]
    })

    ipcMain.handle('select_directory', async () => {
        const win = getMainWindow()
        if (!win) return null
        const result = await dialog.showOpenDialog(win, {
            properties: ['openDirectory', 'createDirectory'],
        })
        return result.canceled ? null : result.filePaths[0] ?? null
    })

    ipcMain.handle('select_image', async () => {
        const win = getMainWindow()
        if (!win) return null
        const result = await dialog.showOpenDialog(win, {
            properties: ['openFile'],
            filters: [
                { name: 'Images', extensions: ['jpg', 'jpeg', 'png', 'webp', 'gif'] },
            ],
        })
        return result.canceled ? null : result.filePaths[0]
    })

    // Launch tooling
    ipcMain.handle('detect_launch_tools', () => detectLaunchTools())

    ipcMain.handle('list_proton_builds', () => listProtonBuilds())

    ipcMain.handle('get_launch_settings', () => readLaunchSettings(store.get('settings')))

    // Returns only the launch keys, never the whole settings object — that one
    // carries the Steam API key.
    ipcMain.handle('set_launch_settings', (_event, { updates }: { updates: LaunchSettings }) => {
        const settings = store.get('settings')
        store.set('settings', { ...settings, ...updates })
        return readLaunchSettings(store.get('settings'))
    })

    // Windows installer flow
    ipcMain.handle('suggest_prefix_path', (_event, { title }: { title: string }) => {
        const { prefixRoot } = readLaunchSettings(store.get('settings'))
        return prefixPathFor(prefixRoot, title)
    })

    ipcMain.handle('inspect_prefix', (_event, { path }: { path: string }) => inspectPrefix(path))

    // Emptying a prefix so an install can be retried under a different Proton.
    // Wine refuses to reuse a prefix built by a newer version, so without this a
    // retry on an older build fails for a reason the user cannot act on.
    //
    // The path comes from the renderer and the user can type any folder into
    // the picker, so it is checked twice: canResetPrefix() rules out paths no
    // prefix should ever live at, and the fs checks below confirm this really
    // is a prefix — a directory that is either empty or carries wine's own
    // layout — before anything is removed.
    ipcMain.handle('reset_wine_prefix', (_event, { path: prefixPath }: { path: string }) => {
        if (!canResetPrefix({ prefixPath, homeDir: os.homedir() })) {
            return { success: false, error: 'That folder is not somewhere Gateway will delete.' }
        }

        let entries: string[]
        try {
            const stat = fs.statSync(prefixPath)
            if (!stat.isDirectory()) return { success: false, error: 'That is not a folder.' }
            entries = fs.readdirSync(prefixPath)
        } catch {
            // Nothing there is the desired end state anyway.
            return { success: true }
        }

        const looksLikePrefix = entries.length === 0
            || entries.includes('pfx') || entries.includes('drive_c') || entries.includes('system.reg')
        if (!looksLikePrefix) {
            return { success: false, error: "That folder holds something other than a game install." }
        }

        try {
            fs.rmSync(prefixPath, { recursive: true, force: true })
            return { success: true }
        } catch (error) {
            return { success: false, error: (error as Error).message }
        }
    })

    ipcMain.handle('run_windows_installer', async (_event, options: RunInstallerOptions) => {
        // Progress is a push event rather than the return value: an installer
        // runs for minutes, and the window has to show something the whole time.
        return runWindowsInstaller(options, (progress) => {
            getMainWindow()?.webContents.send('installer-progress', progress)
        })
    })

    ipcMain.handle('cancel_windows_installer', () => cancelWindowsInstaller())

    // Art for one game, on demand. Called right after a Steam match, where
    // waiting for the next full library sync (covers only) is not good enough.
    ipcMain.handle('fetch_game_art', async (_event, { id, force }: { id: string; force?: boolean }) => {
        const game = store.get('games').find(g => g.id === id)
        if (!game) return { success: false, error: 'Game not found' }

        const patch = await downloadGameArt(game, force ?? false)
        if (Object.keys(patch).length === 0) return { success: false, error: 'No art found for this game' }

        // updateGames, not get/set: downloadGameArt awaits several network
        // round-trips, and a sync may have rewritten the library meanwhile.
        const games = store.updateGames((current) =>
            current.map((g) => (g.id === id ? { ...g, ...patch } : g))
        )
        const updated = games.find(g => g.id === id)
        getMainWindow()?.webContents.send('games-updated', games)
        return { success: true, game: updated }
    })
}
