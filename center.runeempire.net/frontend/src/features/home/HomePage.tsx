import { Clock, Gem, Medal } from 'lucide-react'

import { site } from '@/config/site'
import { useAccount } from '@/features/auth/queries'
import { enterAfter } from '@/lib/motion'

import { DiscordCard } from './DiscordCard'
import { FriendsCard } from './FriendsCard'
import { HeroCard } from './HeroCard'
import { JoinCard } from './JoinCard'
import { PlaytimeCard } from './PlaytimeCard'
import { PunishmentCard } from './PunishmentCard'
import { registeredWithin } from './registration'
import { StatCard } from './StatCard'
import {
  hoursFormat,
  rankColor,
  runeCountFormat,
  shortDate,
  type StatPart,
  toPunishment,
  useMyFriends,
  useMyStats,
} from './stats'

/** How long a new player sees how to join the server. */
const JOIN_HINT_DAYS = 7

/**
 * The overview a player lands on after logging in: the hero with the streak,
 * how to join (for new players), four numbers, this week's playtime beside
 * the Discord, then the friends. The numbers come from GET /api/me/stats,
 * the friends from GET /api/me/friends; until they answer, skeletons.
 */
export function HomePage() {
  const { data: account } = useAccount()
  const { data: stats, isError: statsFailed } = useMyStats()
  const { data: friends, isError: friendsFailed } = useMyFriends()

  /** A part that will not come: its plugin could not be read, or the whole request failed. */
  const missing = (part: StatPart) => (stats ? stats.unavailable.includes(part) : statsFailed)
  /** undefined while loading (a skeleton), null when missing (a dash), else the value. */
  const shown = <T,>(part: StatPart, value: (loaded: NonNullable<typeof stats>) => T | null): T | null | undefined =>
    missing(part) ? null : stats ? value(stats) : undefined

  return (
    <div className="flex flex-col gap-3.5 md:gap-5">
      <title>{`Áttekintés | ${site.name}`}</title>

      <HeroCard streak={shown('streak', (loaded) => loaded.streak)} />

      {registeredWithin(account, JOIN_HINT_DAYS) && <JoinCard />}

      <ul aria-label="Statisztikák" className="grid grid-cols-1 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] md:gap-5">
        <StatCard
          label="Rúnáid"
          icon={Gem}
          value={shown('runes', (loaded) => (loaded.runes === null ? null : runeCountFormat.format(loaded.runes)))}
          unit="rúna"
          className="content-in"
          style={enterAfter(560)}
        />
        <StatCard
          label="Játékidőd"
          icon={Clock}
          value={shown('playtime', (loaded) => loaded.playtime && hoursFormat.format(loaded.playtime.total_seconds / 3600))}
          unit="óra"
          className="content-in"
          style={enterAfter(620)}
        />
        <StatCard
          label="Rangod"
          icon={Medal}
          value={shown('rank', (loaded) =>
            loaded.rank ? <span style={rankColor(loaded.rank.color)}>{loaded.rank.name}</span> : null,
          )}
          className="content-in"
          style={enterAfter(680)}
        >
          {stats?.rank?.expires_at && (
            <span className="inline-flex h-6.5 items-center gap-1.5 self-start rounded-full bg-primary/10 px-2.5 text-xs font-bold text-primary">
              <Clock className="size-3.25" aria-hidden="true" />
              Lejár: {shortDate(stats.rank.expires_at)}
            </span>
          )}
        </StatCard>
        <PunishmentCard
          punishment={stats ? toPunishment(stats.punishment) : undefined}
          unavailable={missing('punishment')}
          className="content-in"
          style={enterAfter(740)}
        />
      </ul>

      <div className="flex flex-wrap gap-3.5 md:gap-5">
        <PlaytimeCard
          week={shown('playtime', (loaded) => loaded.playtime?.week.map((seconds) => (seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0)) ?? null)}
          className="min-w-0 flex-[2_1_480px]"
        />
        <DiscordCard className="flex-[1_1_320px]" />
      </div>

      <FriendsCard friends={friends ?? (friendsFailed ? null : undefined)} />
    </div>
  )
}
