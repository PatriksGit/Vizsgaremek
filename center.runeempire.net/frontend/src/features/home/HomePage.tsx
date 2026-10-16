import { faCalendarDays, faClock, faFire, faGavel, faGem, faServer, type IconDefinition } from '@fortawesome/free-solid-svg-icons'

import { StatTile } from '@/components/app/StatTile'
import type { Tone } from '@/components/app/tones'
import { site } from '@/config/site'
import { enterAfter } from '@/lib/motion'

import { DiscordCard } from './DiscordCard'
import { HeroCard } from './HeroCard'
import { PlaytimeCard } from './PlaytimeCard'

/** The player's numbers; values arrive once the game server's data is wired. */
const STATS: { icon: IconDefinition; tone: Tone; label: string }[] = [
  { icon: faGem, tone: 'enchant', label: 'Rúnák' },
  { icon: faClock, tone: 'xp', label: 'Játékidő' },
  { icon: faFire, tone: 'ember', label: 'Napos sorozat' },
  { icon: faServer, tone: 'diamond', label: 'Online játékosok' },
  { icon: faGavel, tone: 'redstone', label: 'Büntetések' },
  { icon: faCalendarDays, tone: 'gold', label: 'Regisztráció' },
]

/** The overview a player lands on after logging in: greeting, numbers, then playtime and Discord. */
export function HomePage() {
  return (
    <div className="flex flex-col gap-5">
      <title>{`Áttekintés | ${site.name}`}</title>

      <HeroCard />

      <ul aria-label="Statisztikák" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {STATS.map((stat, index) => (
          <StatTile key={stat.label} {...stat} className="content-in" style={enterAfter(560 + index * 60)} />
        ))}
      </ul>

      <div className="grid gap-5 lg:grid-cols-3">
        <PlaytimeCard />
        <DiscordCard />
      </div>
    </div>
  )
}
