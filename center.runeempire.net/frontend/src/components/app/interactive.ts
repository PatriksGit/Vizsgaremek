/**
 * Keyboard focus only (`:focus-visible`). Links that must not keep a ring after a click also call
 * blurAfterPointerClick (lib/focus.ts).
 */
export const focusRing = 'outline-none focus-visible:ring-2 focus-visible:ring-primary/60'

/**
 * A card that opens a player's profile (search results, friends): on hover
 * it lifts 2 px, its edge turns gold and a soft gold glow falls under it, the
 * head grows a little (a `group/player` on the card, `playerHeadGrow` on the
 * head); a press sinks it back. No lift under reduced motion.
 */
export const playerCardHover =
  'group/player transition-[border-color,translate,box-shadow,background-color] duration-200 outline-none hover:-translate-y-0.5 hover:border-primary/45 hover:shadow-[0_10px_24px_-14px_var(--primary)] active:translate-y-0 focus-visible:border-primary/60 focus-visible:ring-3 focus-visible:ring-primary/20 motion-reduce:hover:translate-y-0'

/**
 * The grid of player cards (the friends list and the players search): one column on phones (minmax(0, 1fr), so a 16-letter
 * name is cut, never pushes the page sideways, review 2026-11-24 VI-1), then as many 300 px columns as fit (VI-15).
 */
export const playerGridColumns = 'grid grid-cols-1 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]'

/** The head inside a playerCardHover card. */
export const playerHeadGrow = 'transition-transform duration-200 group-hover/player:scale-110 motion-reduce:group-hover/player:scale-100'
