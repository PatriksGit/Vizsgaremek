import { faClock, faFire, faGavel, faGem, faServer, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import type { ReactNode } from 'react'

import { IconBadge } from '@/components/app/IconBadge'
import { Panel } from '@/components/app/Panel'
import { StatTile } from '@/components/app/StatTile'
import type { Tone } from '@/components/app/tones'
import { features, type Feature } from '@/config/features'
import { site } from '@/config/site'
import { useAccount } from '@/features/auth/queries'
import { enterAfter } from '@/lib/motion'

import { DiscordCard } from './DiscordCard'
import { HeroCard } from './HeroCard'
import { JoinCard } from './JoinCard'
import { PlaytimeCard } from './PlaytimeCard'
import { registeredWithin } from './registration'

type Stat = {
  icon: IconDefinition
  tone: Tone
  label: string
  /** The number, once the game server sends it; until then the stat is only announced as coming. */
  value?: ReactNode
  /** The page with the details, and its switch: the tile links there once the page is built. */
  page?: { to: string; feature: Feature }
}

/** The player's numbers. None has a source yet, so for now they are all announced in the "coming soon" line. */
const STATS: Stat[] = [
  { icon: faGem, tone: 'enchant', label: 'Rúnák', page: { to: '/runak', feature: 'runes' } },
  { icon: faClock, tone: 'xp', label: 'Játékidő' },
  { icon: faFire, tone: 'ember', label: 'Napi sorozat' },
  { icon: faServer, tone: 'diamond', label: 'Online játékosok', page: { to: '/jatekosok', feature: 'players' } },
  { icon: faGavel, tone: 'redstone', label: 'Büntetések', page: { to: '/naplo', feature: 'log' } },
]

/** How long a new player sees how to join the server. */
const JOIN_HINT_DAYS = 7

/**
 * The overview a player lands on after logging in: greeting, how to join (for
 * new players), the numbers that exist, then playtime and Discord.
 */
export function HomePage() {
  const { data: account } = useAccount()
  const live = STATS.filter((stat) => stat.value !== undefined)
  const upcoming = STATS.filter((stat) => stat.value === undefined)

  return (
    <div className="flex flex-col gap-5">
      <title>{`Áttekintés | ${site.name}`}</title>

      <HeroCard />

      {registeredWithin(account, JOIN_HINT_DAYS) && <JoinCard />}

      {live.length > 0 && (
        <ul aria-label="Statisztikák" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
          {live.map(({ page, value, ...stat }, index) => (
            <StatTile
              key={stat.label}
              {...stat}
              value={value}
              to={page && features[page.feature] ? page.to : undefined}
              className="content-in"
              style={enterAfter(560 + index * 60)}
            />
          ))}
        </ul>
      )}

      {upcoming.length > 0 && <UpcomingStats stats={upcoming} />}

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <PlaytimeCard />
        <DiscordCard />
      </div>
    </div>
  )
}

/** The numbers that are on their way, named once in one quiet line instead of as empty tiles. */
function UpcomingStats({ stats }: { stats: Stat[] }) {
  return (
    <Panel
      as="section"
      aria-labelledby="upcoming-title"
      className="content-in flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:gap-5"
      style={enterAfter(600)}
    >
      <p id="upcoming-title" className="shrink-0 text-sm text-muted-foreground">
        Hamarosan itt látod:
      </p>
      <ul className="flex flex-wrap gap-x-4 gap-y-2">
        {stats.map((stat) => (
          <li key={stat.label} className="flex items-center gap-2 pr-2 text-sm text-foreground">
            <IconBadge icon={stat.icon} tone={stat.tone} className="size-7 rounded-md" />
            {stat.label}
          </li>
        ))}
      </ul>
    </Panel>
  )
}
