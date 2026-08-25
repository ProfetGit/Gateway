import type { Game } from './game-library-types'

/**
 * The appid to use for READ-ONLY Steam data: store details, news, achievement
 * definitions. All three work for any appid without owning the game.
 *
 * NEVER use this for launching, installing, or steam:// store links — those
 * must stay gated on `steamAppId`, which means "the user owns this on Steam".
 * A shortcut with a metadataAppId does not own the game, so steam://rungameid
 * would fail.
 */
export function getMetadataAppId(game: Game | null | undefined): string | undefined {
    return game?.steamAppId ?? game?.metadataAppId
}

/**
 * True when achievement unlock state has to come from the user rather than
 * Steam. Steam only reports unlock state for games the user owns, so a game
 * matched purely for metadata is tracked by hand.
 */
export function isManuallyTracked(game: Game | null | undefined): boolean {
    return !game?.steamAppId && !!game?.metadataAppId
}
