/**
 * One row from `lutris --list-games --json`. Shape per Lutris'
 * gui/application.py — note `playtime` is a Python timedelta string
 * ("1:23:45"), NOT a number. Use `playtimeSeconds`.
 */
export interface LutrisCliGame {
    id: number
    slug: string
    name: string
    runner: string | null
    platform: string | null
    directory: string | null
    playtimeSeconds: number | null
    lastplayed: string | null
    coverPath: string | null
}

export interface LutrisStatus {
    installed: boolean
    gamesCount: number
    installedCount: number
}
