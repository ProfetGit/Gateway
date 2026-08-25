import fs from 'node:fs'
import path from 'node:path'

/**
 * Finds the wine prefix a non-Steam shortcut actually runs in.
 *
 * Shortcuts added through a wrapper (faugus-launcher, Lutris, Bottles) point
 * their Exe at the wrapper, not the game, so the prefix has to come from that
 * wrapper's own config. Shortcuts Steam runs directly use compatdata instead.
 */

interface FaugusGame {
    gameid?: string
    title?: string
    path?: string
    prefix?: string
}

function readFaugusGames(): FaugusGame[] {
    const home = process.env.HOME ?? ''
    const candidates = [
        path.join(home, '.local/share/faugus-launcher/games.json'),
        path.join(home, '.var/app/io.github.Faugus.faugus-launcher/data/faugus-launcher/games.json'),
    ]

    for (const file of candidates) {
        try {
            if (!fs.existsSync(file)) continue
            const parsed = JSON.parse(fs.readFileSync(file, 'utf8')) as unknown
            const list = Array.isArray(parsed)
                ? parsed
                : (parsed as { games?: unknown }).games
            if (Array.isArray(list)) return list as FaugusGame[]
        } catch (err) {
            console.warn('[WinePrefix] Could not read faugus games.json:', err)
        }
    }
    return []
}

/**
 * @param exe          the shortcut's executable (often a launcher binary)
 * @param launchArgs   its launch options — carries the wrapper's game id
 * @param title        shortcut name, used as a last-resort match
 * @param steamPath    Steam root, for compatdata lookups
 * @param shortcutId   the non-Steam shortcut's local appid
 */
export function resolveWinePrefix(options: {
    exe?: string
    launchArgs?: string
    title?: string
    steamPath?: string | null
    shortcutId?: string
}): string | undefined {
    const { exe, launchArgs, title, steamPath, shortcutId } = options

    if (exe?.includes('faugus')) {
        const games = readFaugusGames()
        // `--game <gameid>` is the reliable link; fall back to the title.
        const idMatch = launchArgs?.match(/--game[= ]+([\w.-]+)/)
        const gameId = idMatch?.[1]

        const match =
            (gameId ? games.find((g) => g.gameid === gameId) : undefined) ??
            (title ? games.find((g) => g.title === title) : undefined)

        if (match?.prefix && fs.existsSync(match.prefix)) return match.prefix
    }

    // Games Steam launches itself get a prefix under compatdata, keyed by the
    // shortcut's own appid.
    if (steamPath && shortcutId) {
        const compat = path.join(steamPath, 'steamapps/compatdata', shortcutId)
        if (fs.existsSync(compat)) return compat
    }

    return undefined
}
