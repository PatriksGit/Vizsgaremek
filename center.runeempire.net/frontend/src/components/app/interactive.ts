/** Keyboard focus only: a mouse click lets go of the focus (lib/focus.ts blurAfterPointerClick), so no ring stays behind. */
export const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary/60'

/**
 * A card that opens a player's profile (search results, friends): on hover
 * it lifts 2 px, its edge turns gold and a soft gold glow falls under it, the
 * head grows a little (a `group/player` on the card, `playerHeadGrow` on the
 * head); a press sinks it back. No lift under reduced motion.
 */
export const playerCardHover =
  'group/player transition-[border-color,translate,box-shadow,background-color] duration-200 outline-none hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_10px_24px_-14px_var(--primary)] active:translate-y-0 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/20 motion-reduce:hover:translate-y-0'

/** The head inside a playerCardHover card. */
export const playerHeadGrow = 'transition-transform duration-200 group-hover/player:scale-110 motion-reduce:group-hover/player:scale-100'
