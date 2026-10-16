/** Icon badge colours, one per kind of player data (see the palette in index.css). */
export const TONE = {
  gold: 'bg-primary/15 text-primary',
  enchant: 'bg-enchant/15 text-enchant',
  xp: 'bg-xp/15 text-xp',
  ember: 'bg-ember/15 text-ember',
  diamond: 'bg-diamond/15 text-diamond',
  redstone: 'bg-redstone/15 text-redstone',
  discord: 'bg-discord/15 text-discord',
}

export type Tone = keyof typeof TONE
