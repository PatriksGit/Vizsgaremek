import { useId, useState } from 'react'

import { FitLine } from '@/components/app/FitLine'
import { PlayerHead } from '@/components/app/PlayerHead'
import { useAccount } from '@/features/auth/queries'
import { rankColor } from '@/features/home/stats'

import type { Rank } from './api'

/**
 * How the rank looks on the player in game: their head, the rank's prefix
 * image (prefixUrl from the database: the ItemsAdder glyph, 7 px tall pixel
 * art, shown three times bigger and crisp), then their name in the rank's
 * colour. Without a prefix image, or with a broken one, just the name.
 *
 * Always ONE line, like in the game (owner, 2026-11-17: a broken line is not
 * pretty): when the box is narrower than the line (a wide prefix and a long
 * name), the whole line shrinks to fit (FitLine: CSS zoom, so its height
 * shrinks too) instead of wrapping.
 */
export function RankPreview({ rank }: { rank: Rank }) {
  const { data: account } = useAccount()
  // The address that failed, so a corrected one (after a refresh) is tried again.
  const [failedPrefix, setFailedPrefix] = useState<string | null>(null)
  const captionId = useId()

  return (
    <figure
      aria-labelledby={captionId}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background px-3 pt-2 pb-2.5"
    >
      {/* Says what the line is (owner, 2026-11-17): the player's own name as the game shows it. */}
      <figcaption id={captionId} className="text-[11px] font-bold tracking-wide text-faint uppercase">
        Játékbeli kinézet
      </figcaption>
      <FitLine className="justify-center" lineClassName="flex items-center gap-2">
        <PlayerHead name={account?.display_name} className="size-6 flex-none" />
        {rank.prefixUrl && rank.prefixUrl !== failedPrefix && (
          <img
            src={rank.prefixUrl}
            alt={rank.name}
            onError={() => setFailedPrefix(rank.prefixUrl)}
            className="h-5.25 w-auto flex-none [image-rendering:pixelated]"
          />
        )}
        <span className="text-sm font-bold text-foreground" style={rankColor(rank.color)}>
          {account?.display_name}
        </span>
      </FitLine>
    </figure>
  )
}
