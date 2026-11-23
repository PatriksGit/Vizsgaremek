import { faArrowLeft } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link, useLocation, useParams } from 'react-router'

import { Panel } from '@/components/app/Panel'
import { site } from '@/config/site'
import { Dashboard } from '@/features/home/Dashboard'
import { PROFILE_WORDING } from '@/features/home/wording'
import { enterAfter } from '@/lib/motion'

import { isMissingPlayer, PLAYER_NAME, usePlayerFriends, usePlayerProfile } from './api'
import { profileBack } from './links'

/**
 * Another player's profile, /jatekosok/<name>: the same dashboard as the
 * overview with that player's numbers and friends (everything on it is
 * public to logged-in players, owner 2026-11-17). The back link returns to
 * where the profile was opened from (the search, the overview's friends,
 * another profile). A friend's profile opened from a profile is a new page:
 * keyed by the name, so it builds up again like any page.
 */
export function PlayerProfilePage() {
  const { name = '' } = useParams()
  return <Profile key={name.toLowerCase()} name={name} />
}

function Profile({ name }: { name: string }) {
  const { pathname, state } = useLocation()
  const back = profileBack(state)
  const profile = usePlayerProfile(name)
  const friends = usePlayerFriends(name)

  const backLink = (
    <Link
      to={back.to}
      // Back to a profile: with its own back link, so the chain still ends at the search it started from (K2).
      state={back.back && { back: back.back }}
      className="content-in inline-flex items-center gap-2 self-start rounded-md text-sm font-semibold text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-primary/30"
      style={enterAfter(100)}
    >
      <FontAwesomeIcon icon={faArrowLeft} className="size-3.5" aria-hidden="true" />
      {back.label}
    </Link>
  )

  if (!PLAYER_NAME.test(name) || isMissingPlayer(profile.error)) {
    return (
      <div className="mx-auto flex w-full max-w-2xl flex-col gap-4 lg:mt-10">
        <title>{`Játékosok | ${site.name}`}</title>
        {backLink}
        <Panel as="section" className="card-rise flex flex-col gap-2">
          <h1 className="font-heading text-3xl font-bold text-foreground">Nincs ilyen játékos</h1>
          <p className="text-muted-foreground">Ezzel a névvel senki sem regisztrált a szerveren.</p>
        </Panel>
      </div>
    )
  }

  const shownName = profile.data?.name ?? name

  return (
    <div className="flex flex-col gap-3.5 md:gap-5">
      <title>{`${shownName} | ${site.name}`}</title>
      {backLink}
      <Dashboard
        wording={PROFILE_WORDING}
        name={shownName}
        registeredAt={profile.data?.registered_at}
        stats={profile}
        friends={friends}
        friendBack={{ to: pathname, label: `Vissza: ${shownName}`, back }}
      />
    </div>
  )
}
