import { panelLook } from '@/components/app/Panel'
import { PlayerHead } from '@/components/app/PlayerHead'
import { Skeleton } from '@/components/ui/skeleton'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { NO_DATA, rankColor } from './stats'

/** A friend from RuneFriends, as GET /api/me/friends sends it. */
export type Friend = {
  name: string
  online: boolean
  /** Their LuckPerms rank; null when LuckPerms could not be read. */
  rank: { name: string; color: string | null } | null
}

const countFormat = new Intl.NumberFormat('hu-HU')

/**
 * The player's friends from the game: their heads with a green dot while
 * online, the online ones first (the server's order, like /fr in game). Each
 * name and its small rank label take the rank's colour, when it has one.
 * While the list loads, shimmering rows; a dash when it could not be loaded.
 */
export function FriendsCard({ friends, className }: { friends?: Friend[] | null; className?: string }) {
  const online = friends?.filter((friend) => friend.online).length ?? 0

  return (
    <section
      aria-labelledby="friends-title"
      className={cn(panelLook, 'content-in flex flex-col gap-3 p-5 md:gap-4 md:p-6', className)}
      style={enterAfter(1060)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 id="friends-title" className="font-heading text-lg font-bold text-foreground md:text-xl">
          Barátaid
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
          <ul aria-hidden="true" className="grid gap-3 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))]">
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
        <p className="text-sm text-muted-foreground">Még nincs barátod a szerveren.</p>
      ) : (
        <ul className="grid gap-x-3 gap-y-0.5 sm:grid-cols-[repeat(auto-fill,minmax(300px,1fr))] sm:gap-y-3">
          {friends.map((friend) => (
            <li
              key={friend.name}
              className="flex min-h-13 items-center gap-3 sm:min-h-0 sm:rounded-xl sm:border sm:border-border sm:bg-sunken sm:px-3 sm:py-2.5"
            >
              <span className="relative shrink-0">
                <PlayerHead name={friend.name} className="size-8 rounded-sm" />
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
                <span
                  className={cn(
                    'ml-auto shrink-0 rounded-full px-2 py-0.5 text-xs font-bold',
                    !friend.rank.color && 'bg-raised text-soft',
                  )}
                  style={
                    friend.rank.color
                      ? { color: friend.rank.color, backgroundColor: `color-mix(in srgb, ${friend.rank.color} 14%, transparent)` }
                      : undefined
                  }
                >
                  {friend.rank.name}
                </span>
              )}
              <span className="sr-only">{friend.online ? 'Online' : 'Offline'}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}
