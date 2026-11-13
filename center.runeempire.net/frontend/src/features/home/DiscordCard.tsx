import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { panelLook } from '@/components/app/Panel'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { site } from '@/config/site'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { useDiscordWidget, type DiscordMember, type DiscordWidget } from './discord'

/** What Discord itself shows for someone without a picture. */
const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png'

/** How many online members the card lists before the rest become "+N további". */
const MEMBERS_SHOWN = 5

const countFormat = new Intl.NumberFormat('hu-HU')

/** The dot on a member's picture, in Discord's own meaning. */
const STATUS: Record<string, { dot: string; label: string }> = {
  online: { dot: 'bg-ok', label: 'Online' },
  idle: { dot: 'bg-warn', label: 'Tétlen' },
  dnd: { dot: 'bg-danger', label: 'Ne zavarj' },
}

/**
 * Who is on the RuneEmpire Discord right now, drawn in the site's own style
 * from the backend's copy of the widget: the online count, the first few
 * members with their status, and the invite. When the fetch fails, the
 * player can try again.
 */
export function DiscordCard({ className }: { className?: string }) {
  const { data: widget, isPending, isFetching, refetch } = useDiscordWidget()
  // The widget's own invite when it has one; the fixed one keeps the button while Discord is down.
  const invite = widget?.instant_invite ?? site.discordInviteUrl

  return (
    <section
      aria-labelledby="discord-title"
      className={cn(panelLook, 'content-in flex min-w-0 flex-col gap-3 p-5 md:gap-4 md:p-6', className)}
      style={enterAfter(980)}
    >
      <div className="flex items-center gap-3">
        <span
          aria-hidden="true"
          className="grid size-9.5 shrink-0 place-items-center rounded-[10px] bg-discord/16 text-[#8c96ff] shadow-[inset_0_0_0_1px_rgb(255_255_255/0.07)] md:size-11 md:rounded-xl"
        >
          <FontAwesomeIcon icon={faDiscord} className="size-5 md:size-5.5" />
        </span>
        <span className="flex min-w-0 flex-1 flex-col leading-tight">
          <h2 id="discord-title" className="font-heading text-lg font-bold text-foreground md:text-xl">
            Discord
          </h2>
          <span className="text-xs text-muted-foreground">{site.name} közösség</span>
        </span>
        {widget && (
          <span className="flex shrink-0 items-center gap-1.5 text-xs text-muted-foreground">
            <span aria-hidden="true" className="ping size-2 rounded-full bg-ok" />
            <strong className="text-foreground">{countFormat.format(widget.presence_count)}</strong> online
          </span>
        )}
      </div>

      {/* A failed refresh keeps showing the last good answer. */}
      {widget ? (
        <Members widget={widget} />
      ) : isPending ? (
        <MembersSkeleton />
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">Most nem sikerült betölteni a Discordot.</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="h-11 px-4 md:h-9">
            <FontAwesomeIcon icon={faRotateRight} className={cn(isFetching && 'motion-safe:animate-spin')} aria-hidden="true" />
            {isFetching ? 'Próbálkozás…' : 'Újrapróbálás'}
          </Button>
        </div>
      )}

      <a
        href={invite}
        target="_blank"
        rel="noopener noreferrer"
        className="mt-auto flex h-11 items-center justify-center gap-2 rounded-xl bg-discord font-extrabold text-white transition-colors outline-none hover:bg-[#4752c4] focus-visible:ring-2 focus-visible:ring-primary/60 focus-visible:ring-offset-2 focus-visible:ring-offset-card"
      >
        <FontAwesomeIcon icon={faDiscord} className="size-4.5" aria-hidden="true" />
        Csatlakozás a Discordhoz
        <span className="sr-only"> (új lapon nyílik)</span>
      </a>
    </section>
  )
}

function Members({ widget }: { widget: DiscordWidget }) {
  const shown = widget.members.slice(0, MEMBERS_SHOWN)
  const rest = widget.presence_count - shown.length

  if (shown.length === 0) {
    return <p className="text-sm text-muted-foreground">Most senki sincs fent.</p>
  }

  return (
    <ul aria-label="Online tagok" className="flex flex-col gap-0.5">
      {shown.map((member, index) => {
        const status = STATUS[member.status] ?? STATUS.online
        return (
          <li key={index} className="flex min-h-10 items-center gap-3">
            <span className="relative shrink-0">
              <MemberAvatar member={member} className="size-8" />
              <span aria-hidden="true" className={cn('absolute -right-0.75 -bottom-0.75 size-3 rounded-full border-2 border-card', status.dot)} />
            </span>
            <span className="min-w-0 flex-1 truncate font-semibold text-foreground">{member.username}</span>
            <span className="sr-only">{status.label}</span>
          </li>
        )
      })}
      {rest > 0 && <li className="pt-1 pl-11 text-sm text-muted-foreground">+{countFormat.format(rest)} további</li>}
    </ul>
  )
}

/** A member's Discord picture; without one, or if it does not load, Discord's own default picture. Their name is written beside it. */
function MemberAvatar({ member, className }: { member: DiscordMember; className?: string }) {
  return (
    <Avatar className={cn('bg-secondary after:hidden', className)}>
      {member.avatar_url && <AvatarImage src={member.avatar_url} alt="" referrerPolicy="no-referrer" />}
      <AvatarFallback className="bg-transparent">
        <img src={DEFAULT_AVATAR} alt="" referrerPolicy="no-referrer" className="size-full rounded-full" />
      </AvatarFallback>
    </Avatar>
  )
}

function MembersSkeleton() {
  return (
    <div className="flex flex-col gap-0.5">
      {[28, 22, 26, 20, 24].map((width, row) => (
        <div key={row} className="flex min-h-10 items-center gap-3">
          <Skeleton className="size-8 rounded-full" />
          <Skeleton className="h-4" style={{ width: width * 4 }} />
        </div>
      ))}
      <span className="sr-only">A Discord betöltése…</span>
    </div>
  )
}
