// Shared hover choreography for card *contents*. The card's own lift lives in
// InteractiveCard; these are the layers inside it. One rule throughout: enter
// may be slow, exit never is — `duration-*` is the exit, `group-hover:duration-*`
// the enter, so nothing keeps moving after the pointer leaves.

/** Cover/banner zoom. Rides slower than the card lift so it reads as parallax. */
export const cardArtZoom =
    'transition-[opacity,transform] duration-150 ease-out-expo group-hover:duration-[250ms] group-hover:scale-[1.07]'

/** Scrims, scanlines, and other overlays that deepen on hover. */
export const cardOverlayFade =
    'transition-opacity duration-100 ease-out-expo group-hover:duration-200'

/** The accent bloom that rises from the bottom edge. Trails the lift slightly. */
export const cardGlowFade =
    'transition-opacity duration-100 ease-out-expo group-hover:duration-300 group-hover:delay-[40ms]'

/** Titles and labels that tint toward the accent on hover. */
export const cardTextTint = 'transition-colors duration-100 ease-out-expo'

/** Border and shadow on the card surface, passed to InteractiveCard's className. */
export const cardSurface = 'transition-[border-color,box-shadow] duration-100 ease-out-expo'

/** Height of the launch strip. Shared: the card's title block shifts by exactly
 *  this much on hover, so the two must never drift apart. */
export const cardStripHeight = 'max(26px, 15cqw)'
