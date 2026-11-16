import { useState } from 'react'

import { Panel } from '@/components/app/Panel'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { site } from '@/config/site'
import { useMyStats } from '@/features/home/stats'

import { type Rank, useRanks } from './api'
import { ownedUntil } from './dates'
import { PurchaseDialog } from './PurchaseDialog'
import { RankCard } from './RankCard'
import { RankDetailsDialog } from './RankDetailsDialog'
import { useNow } from './useNow'

const gridClass = 'grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3.5 md:gap-5'

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
  const [buying, setBuying] = useState<Rank | null>(null)

  /** undefined while the stats load, null when the balance cannot be read. */
  const balance = stats ? (stats.unavailable.includes('runes') ? null : stats.runes) : statsFailed ? null : undefined
  const until = (rank: Rank | null) => (rank ? ownedUntil(rank, stats, now) : null)

  const buy = (rank: Rank) => {
    setDetails(null)
    setBuying(rank)
  }

  return (
    <div className="flex flex-col gap-5">
      <title>{`Rangok | ${site.name}`}</title>
      <h1 className="sr-only">Rangok</h1>

      {ranks ? (
        <div className={gridClass}>
          {ranks.map((rank) => (
            <RankCard
              key={rank.group}
              rank={rank}
              ownedUntil={until(rank)}
              now={now}
              onDetails={() => setDetails(rank)}
              onBuy={() => buy(rank)}
            />
          ))}
        </div>
      ) : ranksFailed ? (
        <Panel as="section" className="flex flex-col items-start gap-4">
          <p className="text-muted-foreground">A rangokat most nem sikerült betölteni.</p>
          <Button disabled={isFetching} onClick={() => refetch()}>
            Újrapróbálás
          </Button>
        </Panel>
      ) : (
        <div className={gridClass} aria-busy="true">
          <span className="sr-only">betöltés…</span>
          {[0, 1, 2].map((index) => (
            <Skeleton key={index} className="h-105 rounded-2xl" />
          ))}
        </div>
      )}

      <RankDetailsDialog
        rank={details}
        owned={until(details) !== null}
        now={now}
        onClose={() => setDetails(null)}
        onBuy={() => details && buy(details)}
      />
      <PurchaseDialog rank={buying} ownedUntil={until(buying)} balance={balance} now={now} onClose={() => setBuying(null)} />
    </div>
  )
}
