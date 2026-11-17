import { useRef, useState } from 'react'

import { Panel } from '@/components/app/Panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { site } from '@/config/site'
import { cn } from '@/lib/utils'
import { useMyStats } from '@/features/home/stats'

import { type Rank, useRanks } from './api'
import { BalanceBar } from './BalanceBar'
import { ownedUntil } from './dates'
import { PurchaseDialog } from './PurchaseDialog'
import { RankCard } from './RankCard'
import { RankDetailsDialog } from './RankDetailsDialog'
import { useNow } from './useNow'

/**
 * The cards arrive one after another, starting the moment they replace the
 * loading skeletons (a delay before the first would leave the area blank);
 * the stagger stops after six, so nobody waits.
 */
const cardEnterDelay = (index: number) => Math.min(index, 6) * 70

/**
 * The cards wrap by the room they have (owner, 2026-11-17): one column on a
 * phone, two, then three (five ranks: 3 + 2, the last row centred), and all
 * five in a row on a wide screen (about 1600 px). A card never gets narrower
 * than 240 px -- why: below that the in-game look, "Tudj meg többet a
 * rangról" and "Aktív eddig" broke into several lines (review 2026-11-17:
 * 210 px cards at 1440 px). A container query, so the sidebar's width counts.
 */
const listClass = '@container'
const rowClass = 'flex flex-wrap justify-center gap-5'
const cellClass =
  'w-full @min-[32rem]:w-[calc((100%-1.25rem)/2)] @min-[48rem]:w-[calc((100%-2.5rem)/3)] @min-[80rem]:w-[calc((100%-5rem)/5)]'

/**
 * The rank shop (owner's design, Claude Design "Asztali – Rangok"): every rank
 * on sale as a card, "Mit kapsz?" for its text, and the purchase dialog. The
 * ranks come from GET /api/ranks (the database), the balance and the player's
 * rank from GET /api/me/stats; the final purchase button is off for now.
 */
export function RanksPage() {
  const { data: ranks, isError: ranksFailed, isFetching, refetch } = useRanks()
  const { data: stats, isError: statsFailed } = useMyStats()
  const now = useNow()
  const [details, setDetails] = useState<Rank | null>(null)
  const [buying, setBuying] = useState<{ rank: Rank; days: number } | null>(null)
  // The "Mit kapsz?" button that opened the details, and where the purchase's
  // focus goes back to: a purchase started in the details returns to that
  // button, since the one that opened it is gone by then (review 2026-11-17,
  // F1). Refs, not state: they must outlive the closing purchase.
  const detailsTrigger = useRef<HTMLElement | null>(null)
  const purchaseReturn = useRef<HTMLElement | null>(null)

  /** undefined while the stats load, null when the balance cannot be read. */
  const balance = stats ? (stats.unavailable.includes('runes') ? null : stats.runes) : statsFailed ? null : undefined
  const until = (rank: Rank | null) => (rank ? ownedUntil(rank, stats, now) : null)

  const buy = (rank: Rank, days: number, fromDetails = false) => {
    purchaseReturn.current = fromDetails ? detailsTrigger.current : null
    setDetails(null)
    setBuying({ rank, days })
  }

  return (
    <div className="flex flex-col gap-5">
      <title>{`Rangok | ${site.name}`}</title>
      <h1 className="sr-only">Rangok</h1>

      <BalanceBar balance={balance} />

      {ranks?.length === 0 ? (
        // A fresh database, or every rank removed in the management section.
        <Panel as="section">
          <p className="text-muted-foreground">Most nincs megvásárolható rang.</p>
        </Panel>
      ) : ranks ? (
        <div className={listClass}>
          <ul className={rowClass}>
            {ranks.map((rank, index) => (
              <li key={rank.group} className={cn(cellClass, 'flex')}>
                <RankCard
                  enterDelay={cardEnterDelay(index)}
                  rank={rank}
                  level={index + 1}
                  highest={ranks.length > 1 && index === ranks.length - 1}
                  ownedUntil={until(rank)}
                  now={now}
                  onDetails={(trigger) => {
                    detailsTrigger.current = trigger
                    setDetails(rank)
                  }}
                  onBuy={(days) => buy(rank, days)}
                />
              </li>
            ))}
          </ul>
        </div>
      ) : ranksFailed ? (
        <Panel as="section" className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground">A rangokat most nem sikerült betölteni.</p>
          <Button disabled={isFetching} onClick={() => refetch()}>
            Újrapróbálás
          </Button>
        </Panel>
      ) : (
        <div className={listClass} aria-busy="true">
          <span className="sr-only">betöltés…</span>
          <div className={rowClass}>
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className={cn(cellClass, 'h-105 rounded-2xl')} />
            ))}
          </div>
        </div>
      )}

      <RankDetailsDialog
        rank={details}
        ownedUntil={until(details)}
        balance={balance}
        now={now}
        onClose={() => setDetails(null)}
        onBuy={(days) => details && buy(details, days, true)}
      />
      <PurchaseDialog
        rank={buying?.rank ?? null}
        days={buying?.days ?? 0}
        ownedUntil={until(buying?.rank ?? null)}
        balance={balance}
        now={now}
        onClose={() => setBuying(null)}
        finalFocus={() => purchaseReturn.current ?? true}
      />
    </div>
  )
}
