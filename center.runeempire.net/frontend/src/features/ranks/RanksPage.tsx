import { useRef, useState } from 'react'

import { Panel } from '@/components/app/Panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { site } from '@/config/site'
import { staggerDelay } from '@/lib/motion'
import { cn } from '@/lib/utils'
import { useMyStats } from '@/features/home/api'

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
const CARD_STEP = 70

/**
 * The cards wrap by the room they have (owner, 2026-11-17): one column on a
 * phone, then two, three and four in a row (a 1920 px screen: 4 + 1, the last
 * row centred), and never wider than 21rem (the owner: wider cards looked too
 * wide). A card is kept at ~300 px or more -- why: the in-game look stays on
 * one line (head, the widest prefix and a 16-character name) and shrinks to
 * fit, and narrower it would get unreadably small (review 2026-11-17). A
 * container query, so the sidebar's width counts.
 */
const listClass = '@container'
const rowClass = 'flex flex-wrap justify-center gap-5'
const cellClass =
  'w-full @min-[40rem]:w-[calc((100%-1.25rem)/2)] @min-[40rem]:max-w-84 @min-[58rem]:w-[calc((100%-2.5rem)/3)] @min-[78rem]:w-[calc((100%-3.75rem)/4)]'

/**
 * One dialog's rank. The dialog keeps the rank's group (and the purchase its duration), not the rank: a refetch (a new
 * price) reaches an open dialog, and a rank or duration taken off sale closes it (R1, RP1). A closing dialog keeps
 * showing the last rank it had until its exit animation ends, never an empty frame or a 0-rune price (UI-N2, V3).
 */
function useRankDialog(ranks: Rank[] | undefined) {
  const [shown, setShown] = useState<{ group: string; days?: number; open: boolean } | null>(null)
  const live =
    ranks?.find(
      (rank) => rank.group === shown?.group && (shown.days === undefined || rank.prices.some((price) => price.days === shown.days)),
    ) ?? null
  const [last, setLast] = useState(live)
  // Adjusting state while rendering (React's "storing information from previous renders"), not a ref read in render.
  if (live !== null && live !== last) setLast(live)

  return {
    rank: shown ? (live ?? last) : null,
    days: shown?.days ?? 0,
    open: shown?.open === true && live !== null,
    show: (group: string, days?: number) => setShown({ group, days, open: true }),
    close: () => setShown((current) => current && { ...current, open: false }),
    /** The exit animation has finished: the rank can go. */
    closed: () => setShown(null),
  }
}

/**
 * The rank shop (owner's design, Claude Design "Asztali – Rangok"): every rank
 * on sale as a card, "Mit kapsz?" for its text, and the purchase dialog. The
 * ranks come from GET /api/ranks (the database), the balance and the player's
 * rank from GET /api/me/stats; the final purchase button is off for now.
 */
export function RanksPage() {
  const { data: ranks, isFetched: ranksFetched, isFetching, refetch } = useRanks()
  const { data: stats, isFetched: statsFetched } = useMyStats()
  // Failed = answered without data. Not isError: TanStack v5 makes a refetch of a failed query without data
  // pending again, which swapped "Újrapróbálás" for skeletons mid-retry (review 2026-11-17).
  const ranksFailed = !ranks && ranksFetched
  const statsFailed = !stats && statsFetched
  const now = useNow()
  const details = useRankDialog(ranks)
  const purchase = useRankDialog(ranks)
  // The "Mit kapsz?" button that opened the details, and where the purchase's
  // focus goes back to: a purchase started in the details returns to that
  // button, since the one that opened it is gone by then (review 2026-11-17,
  // F1). Refs, not state: they must outlive the closing purchase.
  const detailsTrigger = useRef<HTMLElement | null>(null)
  const purchaseReturn = useRef<HTMLElement | null>(null)

  /** undefined while the stats load, null when the balance cannot be read. */
  const balance = stats ? (stats.unavailable.includes('runes') ? null : stats.runes) : statsFailed ? null : undefined
  const until = (rank: Rank | null) => (rank ? ownedUntil(rank, stats, now) : null)
  // Any card with a season or owned line: the others keep its place, so the cards stay alike.
  const statusRow = ranks?.some((rank) => rank.seasonEndsAt !== null || until(rank) !== null) ?? false

  const buy = (rank: Rank, days: number, fromDetails = false) => {
    purchaseReturn.current = fromDetails ? detailsTrigger.current : null
    details.close()
    purchase.show(rank.group, days)
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
                  enterDelay={staggerDelay(index, CARD_STEP)}
                  rank={rank}
                  statusRow={statusRow}
                  ownedUntil={until(rank)}
                  now={now}
                  onDetails={(trigger) => {
                    detailsTrigger.current = trigger
                    details.show(rank.group)
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
        rank={details.rank}
        ownedUntil={until(details.rank)}
        balance={balance}
        now={now}
        open={details.open}
        onClose={details.close}
        onClosed={details.closed}
        onBuy={(days) => details.rank && buy(details.rank, days, true)}
      />
      <PurchaseDialog
        rank={purchase.rank}
        days={purchase.days}
        ownedUntil={until(purchase.rank)}
        balance={balance}
        now={now}
        open={purchase.open}
        onClose={purchase.close}
        onClosed={purchase.closed}
        finalFocus={() => purchaseReturn.current ?? true}
      />
    </div>
  )
}
