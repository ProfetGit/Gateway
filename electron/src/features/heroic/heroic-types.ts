export type HeroicRunner = 'legendary' | 'gog' | 'sideload'

export interface HeroicGame {
    appName: string
    title: string
    runner: HeroicRunner
    isInstalled: boolean
    installPath?: string
    executable?: string
    platform?: string
    installSize?: number
    /** Tall vertical cover art (Epic's DieselGameBoxTall / art_square). */
    coverUrl?: string
    /** Wide banner art (Epic's DieselGameBox / art_cover). */
    heroUrl?: string
}

export interface HeroicStatus {
    installed: boolean
    dataPath: string | null
    gamesCount: number
    epicCount: number
    gogCount: number
    sideloadCount: number
}
