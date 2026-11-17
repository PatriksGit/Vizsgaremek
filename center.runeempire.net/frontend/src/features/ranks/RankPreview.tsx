import { useState } from 'react'

import { PlayerHead } from '@/components/app/PlayerHead'
import { useAccount } from '@/features/auth/queries'
import { rankColor } from '@/features/home/stats'

import type { Rank } from './api'

/**
 * How the rank looks on the player in game: their head, the rank's prefix
 * (the ItemsAdder image the owner exported to public/rank_icons/<group>.png,
 * 7 px tall pixel art, shown three times bigger and crisp), then their name in
 * the rank's colour. A rank without a prefix image shows just the name.
 */
export function RankPreview({ rank }: { rank: Rank }) {
  const { data: account } = useAccount()
  const [prefixMissing, setPrefixMissing] = useState(false)
  const name = account?.display_name ?? 'Te'

  return (
    <figure
      aria-label="Így néz ki rajtad a játékban"
      className="flex min-h-11 items-center justify-center gap-2 rounded-xl border border-border bg-background px-3 py-2"
    >
      <PlayerHead name={account?.display_name} className="size-6 flex-none" />
      {!prefixMissing && (
        <img
          src={`/rank_icons/${rank.group}.png`}
          alt={rank.name}
          onError={() => setPrefixMissing(true)}
          className="h-5.25 w-auto flex-none [image-rendering:pixelated]"
        />
      )}
      <span className="min-w-0 truncate text-sm font-bold text-foreground" style={rankColor(rank.color)}>
        {name}
      </span>
    </figure>
  )
}
