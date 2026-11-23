import { faClock, faCoins, faHatWizard } from '@fortawesome/free-solid-svg-icons'
import { Clock } from 'lucide-react'
import type { ReactNode } from 'react'

import type { ProfileBack } from '@/features/players/links'

import { countFormat } from '@/lib/budapest'
import { enterAfter } from '@/lib/motion'

import { DiscordCard } from './DiscordCard'
import { type Friend, FriendsCard } from './FriendsCard'
import { HeroCard } from './HeroCard'
import { PlaytimeCard } from './PlaytimeCard'
import { PunishmentCard } from './PunishmentCard'
import { StatCard } from './StatCard'
import { hoursFormat, type MyStats, rankColor, shortDate, type StatPart, type StatsAnswer, toPunishment } from './stats'
import type { DashboardWording } from './wording'

/** The part of a query result the dashboard reads. */
type Loaded<T> = { data?: T; isFetched: boolean }

type DashboardProps = {
  wording: DashboardWording
  name?: string
  registeredAt?: string | null
  stats: Loaded<StatsAnswer>
  friends: Loaded<Friend[]>
  /** Where a friend's profile, opened from this page, leads back to. */
  friendBack: ProfileBack
  /** Shown under the hero, such as how to join for a new player. */
  children?: ReactNode
}

/**
 * One player's dashboard, top to bottom: the hero with the streak, four
 * numbers, this week's playtime beside the Discord, then the friends. The
 * overview shows the logged-in player's, a profile another player's; until
 * the numbers answer, skeletons.
 */
export function Dashboard({ wording, name, registeredAt, stats: statsQuery, friends: friendsQuery, friendBack, children }: DashboardProps) {
  const stats = statsQuery.data
  // Failed = answered without data. Not isError: TanStack v5 makes a refetch of a failed query without data
  // pending again, so the dash would flip to a skeleton on every retry (review 2026-11-17).
  const statsFailed = !stats && statsQuery.isFetched
  /** The server's moment of the numbers: their week and today are that moment's, also when a later refresh fails. */
  const asOf = stats ? new Date(stats.answeredAt) : new Date()
  const friends = friendsQuery.data
  const friendsFailed = !friends && friendsQuery.isFetched

  /** A part that will not come: its plugin could not be read, or the whole request failed. */
  const missing = (part: StatPart) => (stats ? stats.unavailable.includes(part) : statsFailed)
  /** undefined while loading (a skeleton), null when missing (a dash), else the value. */
  const shown = <T,>(part: StatPart, value: (loaded: MyStats) => T | null): T | null | undefined =>
    missing(part) ? null : stats ? value(stats) : undefined

  return (
    <div className="flex flex-col gap-3.5 md:gap-5">
      <HeroCard
        label={wording.heroLabel}
        greeting={wording.greeting}
        name={name}
        registeredAt={registeredAt}
        streak={shown('streak', (loaded) => loaded.streak)}
        streakText={wording.streak}
        asOf={asOf}
      />

      {children}

      <ul aria-label="Statisztikák" className="grid grid-cols-1 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] md:gap-5">
        <StatCard
          label={wording.runes}
          icon={faCoins}
          value={shown('runes', (loaded) => (loaded.runes === null ? null : countFormat.format(loaded.runes)))}
          unit="rúna"
          className="content-in"
          style={enterAfter(560)}
        />
        <StatCard
          label={wording.playtime}
          icon={faClock}
          value={shown('playtime', (loaded) => loaded.playtime && hoursFormat.format(loaded.playtime.total_seconds / 3600))}
          unit="óra"
          className="content-in"
          style={enterAfter(620)}
        />
        <StatCard
          label={wording.rank}
          icon={faHatWizard}
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
          label={wording.punishment}
          punishment={stats ? toPunishment(stats.punishment) : undefined}
          unavailable={missing('punishment')}
          className="content-in"
          style={enterAfter(740)}
        />
      </ul>

      <div className="flex flex-wrap gap-3.5 md:gap-5">
        <PlaytimeCard
          asOf={asOf}
          emptyText={wording.noPlaytime}
          week={shown('playtime', (loaded) => loaded.playtime?.week.map((seconds) => (seconds > 0 ? Math.max(1, Math.round(seconds / 60)) : 0)) ?? null)}
          className="min-w-0 flex-[2_1_480px]"
        />
        <DiscordCard className="flex-[1_1_320px]" />
      </div>

      <FriendsCard
        title={wording.friends}
        emptyText={wording.noFriends}
        back={friendBack}
        friends={friends ?? (friendsFailed ? null : undefined)}
      />
    </div>
  )
}
