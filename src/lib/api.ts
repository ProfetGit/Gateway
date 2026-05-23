/**
 * Tauri IPC wrapper — replaces window.api (Electron contextBridge).
 * All backend communication goes through invoke() / listen().
 */
import { invoke } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import type { Game } from '../types/game'

// ─── Types ────────────────────────────────────────────────────

export interface SteamUser {
  steamId: string
  username: string
  avatarUrl: string
  profileUrl: string
}

export interface AuthState {
  isLoggedIn: boolean
  user: SteamUser | null
}

export interface SteamStatus {
  installed: boolean
  steamPath: string | null
  libraryPaths: string[]
  userId: string | null
  username: string | null
}

export interface SteamOwnedGame {
  appId: string
  name: string
  playtime: number
}

export interface FetchGamesResult {
  success: boolean
  games: SteamOwnedGame[]
  error?: string
}

export interface Achievement {
  apiname: string
  name: string
  description: string
  achieved: boolean
  unlocktime: number
  icon: string
  icongray: string
}

export interface FetchAchievementsResult {
  success: boolean
  achievements: Achievement[]
  totalAchievements: number
  unlockedCount: number
  gameName?: string
  error?: string
  errorCode?: string
}

export interface SetupState {
  hasCompletedSetup: boolean
  hasApiKey: boolean
  isSteamLoggedIn: boolean
  hasGames: boolean
}

// ─── Game CRUD ────────────────────────────────────────────────

export const getGames = () => invoke<Game[]>('get_games')
export const addGame = (game: Omit<Game, 'id'>) => invoke<Game>('add_game', { game })
export const updateGame = (id: string, updates: Partial<Game>) =>
  invoke<Game>('update_game', { id, updates })
export const deleteGame = (id: string) => invoke<void>('delete_game', { id })
export const launchGame = (game: Game) => invoke<void>('launch_game', { game })
export const uninstallGame = (game: Game) =>
  invoke<{ success: boolean; error?: string }>('uninstall_game', { game })

// ─── Steam library ────────────────────────────────────────────

export const syncSteam = () => invoke<Game[]>('sync_steam')
export const getSteamStatus = () => invoke<SteamStatus>('get_steam_status')
export const installSteamGame = (appId: string) => invoke<void>('install_steam_game', { appId })
export const clearAndResync = () =>
  invoke<{ success: boolean; error?: string; totalGames?: number; installedGames?: number }>(
    'clear_and_resync'
  )

// ─── Auth ─────────────────────────────────────────────────────

export const steamLogin = () => invoke<AuthState>('steam_login')
export const steamLogout = () => invoke<AuthState>('steam_logout')
export const getAuthState = () => invoke<AuthState>('get_auth_state')
export const hasSteamApiKey = () => invoke<boolean>('has_steam_api_key')
export const fetchSteamGames = () => invoke<FetchGamesResult>('fetch_steam_games')

// ─── Achievements ─────────────────────────────────────────────

export const getAchievements = (appId: string) =>
  invoke<FetchAchievementsResult>('get_achievements', { appId })

// ─── Steam Store API ──────────────────────────────────────────

export const getGameNews = (appId: string, count = 10) =>
  invoke<unknown>('get_game_news', { appId, count })
export const getGameDetails = (appId: string) =>
  invoke<unknown>('get_game_details', { appId })
export const getTrendingGames = () => invoke<unknown>('get_trending_games')
export const getFreeDeals = () => invoke<unknown>('get_free_deals')

// ─── Navigation / links ───────────────────────────────────────

export const openSteamStore = (appId: string | number) =>
  invoke<void>('open_steam_store', { appId: String(appId) })
export const openSteamStoreClaim = (appId: string | number) =>
  invoke<void>('open_steam_store_claim', { appId: String(appId) })
export const checkGameOwned = (appId: string) =>
  invoke<{ success: boolean; owned: boolean }>('check_game_owned', { appId })
export const openUrl = (url: string) => invoke<void>('open_url', { url })

// ─── File dialogs ─────────────────────────────────────────────

export const selectExecutable = () => invoke<string | null>('select_executable')
export const selectImage = () => invoke<string | null>('select_image')

// ─── Setup ────────────────────────────────────────────────────

export const getSetupState = () => invoke<SetupState>('get_setup_state')
export const markSetupComplete = () => invoke<void>('mark_setup_complete')
export const setSteamApiKey = (key: string) =>
  invoke<{ success: boolean; hasKey: boolean; error?: string }>('set_steam_api_key', { key })
export const getSteamApiKey = () => invoke<string>('get_steam_api_key')

// ─── Window controls — use Tauri window API directly ──────────
// (see TopNavigation.tsx for usage)

// ─── Event listeners ─────────────────────────────────────────

export const onGamesUpdated = (cb: (games: Game[]) => void): Promise<UnlistenFn> =>
  listen<Game[]>('games-updated', (event) => cb(event.payload))

export const onGameClaimed = (
  cb: (data: { appId: string; owned: boolean }) => void
): Promise<UnlistenFn> =>
  listen<{ appId: string; owned: boolean }>('game-claimed', (event) => cb(event.payload))

export const onAuthStateUpdated = (
  cb: (state: AuthState) => void
): Promise<UnlistenFn> =>
  listen<AuthState>('auth-state-updated', (event) => cb(event.payload))
