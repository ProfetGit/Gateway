import fs from 'node:fs'
import path from 'node:path'

/**
 * fs.watch's `recursive` option only works on macOS and Windows — on Linux it
 * is silently ignored rather than erroring, so a watcher on a parent directory
 * never sees changes to files in its subdirectories. Electron 33 bundles Node
 * 20, which has no Linux recursive support at all.
 *
 * This watches every subdirectory individually instead, and picks up newly
 * created subdirectories (e.g. an emulator's per-appid folder that doesn't
 * exist until the game's first run) as they appear.
 */
export function watchRecursive(
    rootDir: string,
    onChange: (fullPath: string) => void,
    maxDepth = 4,
): fs.FSWatcher[] {
    const watchers: fs.FSWatcher[] = []
    const watchedDirs = new Set<string>()

    function watchDir(dir: string, depth: number) {
        if (watchedDirs.has(dir) || depth > maxDepth) return
        watchedDirs.add(dir)

        try {
            const watcher = fs.watch(dir, (_event, filename) => {
                if (!filename) return
                const fullPath = path.join(dir, filename)

                // A newly created subdirectory needs its own watcher — this is
                // how a late-appearing per-appid folder gets picked up.
                fs.stat(fullPath, (err, stats) => {
                    if (!err && stats.isDirectory()) {
                        watchDir(fullPath, depth + 1)
                    }
                })

                onChange(fullPath)
            })
            watcher.on('error', (err) => console.warn(`[Achievements] Watch error on ${dir}:`, err))
            watchers.push(watcher)
        } catch (err) {
            console.warn(`[Achievements] Could not watch ${dir}:`, err)
        }

        try {
            for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
                if (entry.isDirectory()) {
                    watchDir(path.join(dir, entry.name), depth + 1)
                }
            }
        } catch {
            // Directory may have vanished between the outer check and here.
        }
    }

    watchDir(rootDir, 0)
    return watchers
}
