import { faCalendarDays, faClock, faFire, faGavel, faGem, faServer, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import type { ReactNode } from 'react'

import { StatTile } from '@/components/app/StatTile'
import type { Tone } from '@/components/app/tones'
import { site } from '@/config/site'
import { builtPage } from '@/features/app/nav'
import { runeCountFormat, useRuneBalance } from '@/features/app/runes'
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
  /** The number, once its source exists; until then the tile shows a skeleton. */
  value?: ReactNode
  /** The page with the details; the tile links there while the menu lists it as built. */
  page?: string
}

/** "2026.03.18.": the compact Hungarian form, so a date fits a tile on one line. */
function shortDate(iso: string) {
  const date = new Date(iso)
  const twoDigits = (value: number) => String(value).padStart(2, '0')
  return `${date.getFullYear()}.${twoDigits(date.getMonth() + 1)}.${twoDigits(date.getDate())}.`
}

/** How long a new player sees how to join the server. */
const JOIN_HINT_DAYS = 7

/**
 * The overview a player lands on after logging in: greeting, how to join (for
 * new players), the player's numbers, then this week's playtime and Discord.
 */
export function HomePage() {
  const { data: account } = useAccount()
  const runes = useRuneBalance()

  const stats: Stat[] = [
    {
      icon: faGem,
      tone: 'enchant',
      label: 'Rúnák',
      value: runes === undefined ? undefined : runeCountFormat.format(runes),
      page: '/runak',
    },
    { icon: faClock, tone: 'xp', label: 'Játékidő' },
    { icon: faFire, tone: 'ember', label: 'Napi sorozat' },
    { icon: faServer, tone: 'diamond', label: 'Online játékosok', page: '/jatekosok' },
    { icon: faGavel, tone: 'redstone', label: 'Büntetések', page: '/szankciok' },
    {
      icon: faCalendarDays,
      tone: 'gold',
      label: 'Regisztráció',
      value: account?.registered_at ? shortDate(account.registered_at) : undefined,
    },
  ]

  return (
    <div className="flex flex-col gap-5">
      <title>{`Áttekintés | ${site.name}`}</title>

      <HeroCard />

      {registeredWithin(account, JOIN_HINT_DAYS) && <JoinCard />}

      <ul aria-label="Statisztikák" className="grid grid-cols-2 gap-4 md:grid-cols-3 xl:grid-cols-6">
        {stats.map(({ page, ...stat }, index) => (
          <StatTile
            key={stat.label}
            {...stat}
            to={page && builtPage(page)}
            className="content-in"
            style={enterAfter(560 + index * 60)}
          />
        ))}
      </ul>

      <div className="grid grid-cols-1 gap-5 lg:grid-cols-3">
        <PlaytimeCard />
        <DiscordCard />
      </div>
    </div>
  )
}
