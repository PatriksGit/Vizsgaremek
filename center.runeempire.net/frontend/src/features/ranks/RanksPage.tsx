import { useState } from 'react'

import { site } from '@/config/site'
import { useMyStats } from '@/features/home/stats'

import { ownedUntil } from './dates'
import { PurchaseDialog } from './PurchaseDialog'
import { RankCard } from './RankCard'
import { RankDetailsDialog } from './RankDetailsDialog'
import { RANKS, type Rank } from './ranks'
import { useNow } from './useNow'

/**
 * The rank shop (owner's design, Claude Design "Asztali – Rangok"): every rank
 * on sale as a card, "Mit kapsz?" for its perks, and the purchase dialog.
 * Frontend only for now: the ranks come from ranks.ts, the balance and the
 * player's rank from GET /api/me/stats, and the final purchase button is off.
 */
export function RanksPage() {
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

      <div className="grid grid-cols-[repeat(auto-fill,minmax(min(300px,100%),1fr))] gap-3.5 md:gap-5">
        {RANKS.map((rank) => (
          <RankCard
            key={rank.id}
            rank={rank}
            ownedUntil={until(rank)}
            now={now}
            onDetails={() => setDetails(rank)}
            onBuy={() => buy(rank)}
          />
        ))}
      </div>

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
