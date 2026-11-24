import { site } from '@/config/site'
import { useAccount } from '@/features/auth/queries'

import { useMyFriends, useMyStats } from './api'
import { Dashboard } from './Dashboard'
import { JoinCard } from './JoinCard'
import { registeredWithin } from './registration'
import { OWN_WORDING } from './wording'

/** How long a new player sees how to join the server. */
const JOIN_HINT_DAYS = 7
/** How long a player is welcomed, not welcomed back. */
const WELCOME_DAYS = 1

/**
 * The overview a player lands on after logging in: their own dashboard
 * (Dashboard), with how to join for new players under the hero. The numbers
 * come from GET /api/me/stats, the friends from GET /api/me/friends. A
 * player on their first day is welcomed, not welcomed back.
 */
export function HomePage() {
  const { data: account } = useAccount()
  const stats = useMyStats()
  const friends = useMyFriends()
  // The server's moment once the stats answered (their Date header); the visitor's clock only until then (HO-K1).
  const now = stats.data?.answeredAt
  const greeting = registeredWithin(account, WELCOME_DAYS, now) ? 'Üdv a birodalomban,' : 'Üdv újra a birodalomban,'

  return (
    <>
      <title>{`Főoldal | ${site.name}`}</title>
      <Dashboard
        wording={{ ...OWN_WORDING, greeting }}
        name={account?.display_name}
        registeredAt={account?.registered_at}
        stats={stats}
        friends={friends}
        friendBack={{ to: '/', label: 'Vissza a főoldalra' }}
      >
        {registeredWithin(account, JOIN_HINT_DAYS, now) && <JoinCard />}
      </Dashboard>
    </>
  )
}
