import { Link } from 'react-router'

import { playerCardHover, playerGridColumns, playerHeadGrow } from '@/components/app/interactive'
import { panelLook } from '@/components/app/Panel'
import { Pill } from '@/components/app/Pill'
import { PlayerHead } from '@/components/app/PlayerHead'
import { rankColor } from '@/components/app/rankColor'
import { Skeleton } from '@/components/ui/skeleton'
import { type ProfileBack, profilePath } from '@/features/players/links'
import { countFormat } from '@/lib/budapest'
import { enterAfter } from '@/lib/motion'
import { NO_DATA } from '@/lib/noData'
import { cn } from '@/lib/utils'

import type { Friend } from './api'

/**
 * The player's friends from the game: their heads with a green dot while
 * online, the online ones first (the server's order, like /fr in game). Each
 * name and its small rank label take the rank's colour, when it has one.
 * While the list loads, shimmering rows; a dash when it could not be loaded.
 * The title and the empty line speak to the player on the overview, about
 * the player on another player's profile. Each friend with a profile opens it;
 * `back` is where that profile's back link leads.
 */
export function FriendsCard({
  friends,
  title,
  emptyText,
  back,
}: {
  friends?: Friend[] | null
  /** From wording.ts: "Barátaid" on the overview, "Barátai" on a profile; so is the empty line. */
  title: string
  emptyText: string
  back: ProfileBack
}) {
  const online = friends?.filter((friend) => friend.online).length ?? 0

  return (
    <section
      aria-labelledby="friends-title"
      className={cn(panelLook, 'content-in flex flex-col gap-3 p-5 md:gap-4 md:p-6')}
      style={enterAfter(1060)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="friends-title" className="font-heading text-lg font-bold text-foreground md:text-xl">
          {title}
        </h2>
        {friends ? (
          <span className="flex items-center gap-2 text-xs text-muted-foreground md:text-[13px]">
            {online > 0 && <span aria-hidden="true" className="ping size-2 rounded-full bg-ok" />}
            <strong className="text-foreground">{countFormat.format(online)}</strong> online
            <span className="max-md:hidden">
              · <strong className="text-foreground">{countFormat.format(friends.length)}</strong> barát
            </span>
          </span>
        ) : friends === null ? (
          <span className="text-xs text-muted-foreground md:text-[13px]">{NO_DATA}</span>
        ) : (
          <Skeleton className="h-4 w-28" />
        )}
      </div>

      {friends === null ? (
        <p className="text-2xl font-extrabold text-muted-foreground">
          {NO_DATA}
          <span className="sr-only"> A barátlista most nem érhető el.</span>
        </p>
      ) : friends === undefined ? (
        <div aria-busy="true">
          <ul aria-hidden="true" className={cn(playerGridColumns, 'gap-3')}>
            {[24, 18, 28].map((width, index) => (
              <li key={index} className="flex items-center gap-3 rounded-xl border border-border bg-sunken px-3 py-2.5">
                <Skeleton className="size-8 rounded-sm" />
                <Skeleton className="h-4" style={{ width: width * 4 }} />
              </li>
            ))}
          </ul>
          <span className="sr-only">A barátok betöltése…</span>
        </div>
      ) : friends.length === 0 ? (
        <p className="text-sm text-muted-foreground">{emptyText}</p>
      ) : (
        <ul className={cn(playerGridColumns, 'gap-x-3 gap-y-0.5 sm:gap-y-3')}>
          {friends.map((friend) => (
            <li key={friend.name}>
              {friend.has_profile ? (
                <Link to={profilePath(friend.name)} state={{ back }} className={cn(rowClass, playerCardHover)}>
                  <FriendRow friend={friend} />
                </Link>
              ) : (
                <div className={rowClass}>
                  <FriendRow friend={friend} />
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/**
 * A friend's row: a plain row on phones, a card from sm. A friend with a
 * profile is a link that lifts on hover (playerCardHover) and lights up while
 * pressed on phones; one without (no website account) stays a plain row.
 */
const rowClass =
  'flex min-h-13 items-center gap-3 rounded-lg max-sm:-mx-2 max-sm:px-2 max-sm:active:bg-raised sm:min-h-0 sm:rounded-xl sm:border sm:border-border sm:bg-sunken sm:px-3 sm:py-2.5'

function FriendRow({ friend }: { friend: Friend }) {
  return (
    <>
      <span className="relative shrink-0">
        <PlayerHead name={friend.name} className={cn('size-8 rounded-sm', friend.has_profile && playerHeadGrow)} />
        <span
          aria-hidden="true"
          className={cn(
            'absolute -right-0.75 -bottom-0.75 size-3 rounded-full border-2 border-card sm:border-sunken',
            friend.online ? 'bg-ok' : 'bg-sunken shadow-[inset_0_0_0_2px_var(--danger)]',
          )}
        />
      </span>
      <span className="min-w-0 truncate font-bold text-foreground" style={rankColor(friend.rank?.color ?? null)}>
        {friend.name}
      </span>
      {friend.rank && (
        <Pill
          tone={friend.rank.color ? undefined : 'neutral'}
          className="ml-auto shrink-0 px-2 py-0.5"
          style={
            friend.rank.color
              ? { color: friend.rank.color, backgroundColor: `color-mix(in srgb, ${friend.rank.color} 14%, transparent)` }
              : undefined
          }
        >
          {friend.rank.name}
        </Pill>
      )}
      <span className="sr-only">{friend.online ? 'Online' : 'Offline'}</span>
    </>
  )
}
