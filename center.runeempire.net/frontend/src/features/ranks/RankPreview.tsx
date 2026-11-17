import { useId, useState } from 'react'

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
  const captionId = useId()

  return (
    <figure
      aria-labelledby={captionId}
      className="@container flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background px-3 pt-2 pb-2.5"
    >
      {/* Says what the line is (owner, 2026-11-17): the player's own name as the game shows it. */}
      <figcaption id={captionId} className="text-[11px] font-bold tracking-wide text-faint uppercase">
        Játékbeli kinézet
      </figcaption>
      {/*
       * The head and the prefix always stay together, the name under them; one
       * line like in the game only when the box has room for the widest prefix
       * and a 16-character name (21rem). It goes by the box's width, not the
       * prefix's, so every card in a row looks the same (review 2026-11-17: the
       * long prefixes broke into two or three lines, the short ones did not).
       */}
      <div className="flex w-full flex-col items-center gap-1 @min-[21rem]:flex-row @min-[21rem]:justify-center @min-[21rem]:gap-2">
        <span className="flex max-w-full items-center gap-2">
          <PlayerHead name={account?.display_name} className="size-6 flex-none" />
          {rank.prefixUrl && rank.prefixUrl !== failedPrefix && (
            <img
              src={rank.prefixUrl}
              alt={rank.name}
              onError={() => setFailedPrefix(rank.prefixUrl)}
              // Never wider than the box: a very wide prefix shrinks instead of sticking out.
              className="h-5.25 w-auto min-w-0 object-contain [image-rendering:pixelated]"
            />
          )}
        </span>
        <span className="max-w-full text-sm font-bold break-all text-foreground" style={rankColor(rank.color)}>
          {account?.display_name}
        </span>
      </div>
    </figure>
  )
}
