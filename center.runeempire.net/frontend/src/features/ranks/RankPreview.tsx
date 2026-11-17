import { useState } from 'react'

import { PlayerHead } from '@/components/app/PlayerHead'
import { useAccount } from '@/features/auth/queries'
import { rankColor } from '@/features/home/stats'

import type { Rank } from './api'

/**
 * How the rank looks on the player in game: their head, the rank's prefix
 * image (prefixUrl from the database: the ItemsAdder glyph, 7 px tall pixel
 * art, shown three times bigger and crisp), then their name in the rank's
 * colour. Without a prefix image, or with a broken one, just the name.
 */
export function RankPreview({ rank }: { rank: Rank }) {
  const { data: account } = useAccount()
  // The address that failed, so a corrected one (after a refresh) is tried again.
  const [failedPrefix, setFailedPrefix] = useState<string | null>(null)

  return (
    <figure
      aria-label="Így néz ki rajtad a játékban"
      // Wraps instead of cutting: a 16-character name after a wide prefix moves to its own line.
      className="flex min-h-11 flex-wrap items-center justify-center gap-x-2 gap-y-1 rounded-xl border border-border bg-background px-3 py-2"
    >
      <PlayerHead name={account?.display_name} className="size-6 flex-none" />
      {rank.prefixUrl && rank.prefixUrl !== failedPrefix && (
        <img
          src={rank.prefixUrl}
          alt={rank.name}
          onError={() => setFailedPrefix(rank.prefixUrl)}
          className="h-5.25 w-auto flex-none [image-rendering:pixelated]"
        />
      )}
      <span className="min-w-0 text-sm font-bold break-all text-foreground" style={rankColor(rank.color)}>
        {account?.display_name}
      </span>
    </figure>
  )
}
