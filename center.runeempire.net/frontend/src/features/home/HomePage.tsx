import { Clock, Crown, Gem } from 'lucide-react'

import { site } from '@/config/site'
import { runeCountFormat, useRuneBalance } from '@/features/app/runes'
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

/** How long a new player sees how to join the server. */
const JOIN_HINT_DAYS = 7

/**
 * The overview a player lands on after logging in: the hero with the streak,
 * how to join (for new players), four numbers, this week's playtime beside
 * the Discord, then the friends. Numbers the server does not send yet show
 * skeletons; the stats API will fill them through the cards' props.
 */
export function HomePage() {
  const { data: account } = useAccount()
  const runes = useRuneBalance()

  return (
    <div className="flex flex-col gap-3.5 md:gap-5">
      <title>{`Áttekintés | ${site.name}`}</title>

      <HeroCard />

      {registeredWithin(account, JOIN_HINT_DAYS) && <JoinCard />}

      <ul aria-label="Statisztikák" className="grid grid-cols-1 gap-2.5 sm:grid-cols-[repeat(auto-fit,minmax(200px,1fr))] md:gap-5">
        <StatCard
          label="Rúnaegyenleg"
          icon={Gem}
          tone="rune"
          value={runes === undefined ? undefined : runeCountFormat.format(runes)}
          unit="rúna"
          className="content-in"
          style={enterAfter(560)}
        />
        <StatCard label="Összes játékidő" icon={Clock} tone="neutral" unit="óra" className="content-in" style={enterAfter(620)} />
        <StatCard label="Rang" icon={Crown} tone="gold" className="content-in" style={enterAfter(680)} />
        <PunishmentCard className="content-in" style={enterAfter(740)} />
      </ul>

      <div className="flex flex-wrap gap-3.5 md:gap-5">
        <PlaytimeCard className="min-w-0 flex-[2_1_480px]" />
        <DiscordCard className="flex-[1_1_320px]" />
      </div>

      <FriendsCard />
    </div>
  )
}
