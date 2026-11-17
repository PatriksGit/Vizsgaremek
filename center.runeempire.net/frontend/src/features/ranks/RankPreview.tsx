import { useEffect, useId, useRef, useState } from 'react'

import { PlayerHead } from '@/components/app/PlayerHead'
import { useAccount } from '@/features/auth/queries'
import { rankColor } from '@/features/home/stats'

import type { Rank } from './api'
import { fitScale } from './shop'

/**
 * How the rank looks on the player in game: their head, the rank's prefix
 * image (prefixUrl from the database: the ItemsAdder glyph, 7 px tall pixel
 * art, shown three times bigger and crisp), then their name in the rank's
 * colour. Without a prefix image, or with a broken one, just the name.
 *
 * Always ONE line, like in the game (owner, 2026-11-17: a broken line is not
 * pretty): when the box is narrower than the line (a wide prefix and a long
 * name), the whole line shrinks to fit (CSS zoom, so its height shrinks too)
 * instead of wrapping.
 */
export function RankPreview({ rank }: { rank: Rank }) {
  const { data: account } = useAccount()
  // The address that failed, so a corrected one (after a refresh) is tried again.
  const [failedPrefix, setFailedPrefix] = useState<string | null>(null)
  const captionId = useId()
  const box = useRef<HTMLDivElement>(null)
  const line = useRef<HTMLDivElement>(null)
  // The zoom on the line now: its measured width divided by it is its natural width.
  const applied = useRef(1)
  const [scale, setScale] = useState(1)

  // Measured again whenever the box resizes or the line changes (the prefix image loading, another name).
  useEffect(() => {
    const boxElement = box.current
    const lineElement = line.current
    if (!boxElement || !lineElement) return

    const observer = new ResizeObserver(() => {
      const natural = lineElement.getBoundingClientRect().width / applied.current
      const next = fitScale(natural, boxElement.clientWidth)
      if (Math.abs(next - applied.current) > 0.005) {
        applied.current = next
        setScale(next)
      }
    })
    observer.observe(boxElement)
    observer.observe(lineElement)
    return () => observer.disconnect()
  }, [])

  return (
    <figure
      aria-labelledby={captionId}
      className="flex flex-col items-center gap-1.5 rounded-xl border border-border bg-background px-3 pt-2 pb-2.5"
    >
      {/* Says what the line is (owner, 2026-11-17): the player's own name as the game shows it. */}
      <figcaption id={captionId} className="text-[11px] font-bold tracking-wide text-faint uppercase">
        Játékbeli kinézet
      </figcaption>
      <div ref={box} className="flex w-full justify-center">
        {/* flex-none: as a flex item it would squeeze to the box and spill, and measure as if it fit. */}
        <div ref={line} style={{ zoom: scale }} className="flex w-max flex-none items-center gap-2 whitespace-nowrap">
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
        </div>
      </div>
    </figure>
  )
}
