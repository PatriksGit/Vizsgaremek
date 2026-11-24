import { faClock, faCoins, faHatWizard } from '@fortawesome/free-solid-svg-icons'
import { Clock } from 'lucide-react'
import type { ReactNode } from 'react'

import { Pill } from '@/components/app/Pill'
import { rankColor } from '@/components/app/rankColor'
import type { ProfileBack } from '@/features/players/links'

import { countFormat, shortDate } from '@/lib/budapest'
import { enterAfter } from '@/lib/motion'

import type { Friend, MyStats, StatPart, StatsAnswer } from './api'
import { DiscordCard } from './DiscordCard'
import { FriendsCard } from './FriendsCard'
import { HeroCard } from './HeroCard'
import { PlaytimeCard } from './PlaytimeCard'
import { type Punishment, PunishmentCard } from './PunishmentCard'
import { StatCard } from './StatCard'
import type { DashboardWording } from './wording'

/** Hours with at most one decimal ("2,5"). */
const hoursFormat = new Intl.NumberFormat('hu-HU', { maximumFractionDigits: 1 })

/** The punishment as the card shows it. */
function toPunishment(punishment: MyStats['punishment']): Punishment | null {
  return punishment && {
    kind: punishment.kind,
    until: punishment.until,
    issuedAt: punishment.issued_at,
    issuedBy: punishment.issued_by,
    reason: punishment.reason,
  }
}

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
            // Like the "Csatlakozott" pill (V1): it may grow and break once, only between the label and the date.
            <Pill tone="gold" className="min-h-6.5 self-start py-1">
              <Clock className="size-3.25 shrink-0" aria-hidden="true" />
              <span>
                Lejár: <span className="whitespace-nowrap">{shortDate(stats.rank.expires_at)}</span>
              </span>
            </Pill>
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
