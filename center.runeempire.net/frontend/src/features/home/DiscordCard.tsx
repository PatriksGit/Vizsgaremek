import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { faRotateRight, faVolumeHigh } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { Panel, PanelHeader } from '@/components/app/Panel'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Button } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { site } from '@/config/site'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { useDiscordWidget, type DiscordMember, type DiscordWidget } from './discord'

/** What Discord itself shows for someone without a picture. */
const DEFAULT_AVATAR = 'https://cdn.discordapp.com/embed/avatars/0.png'

/** How many people a channel lists before the rest become "+N további". */
const MEMBERS_SHOWN = 8

const countFormat = new Intl.NumberFormat('hu-HU')

/**
 * Who is on the RuneEmpire Discord and every voice channel with who sits in
 * it, drawn in the site's own style from the backend's copy of the widget.
 * It sizes itself to its own width (a container), not the window's: in the
 * overview's narrow column the channels stack and the join button sits at
 * the bottom; given more room, the channels spread over columns and the
 * button moves up beside the title. When the fetch fails, the player can try again.
 */
export function DiscordCard() {
  const { data: widget, isPending, isFetching, refetch } = useDiscordWidget()
  // The widget's own invite when it has one; the fixed one keeps the button while Discord is down.
  const invite = widget?.instant_invite ?? site.discordInviteUrl

  return (
    <Panel as="section" className="content-in @container flex min-w-0 flex-col gap-5" style={enterAfter(980)}>
      <div className="flex items-center justify-between gap-4">
        <PanelHeader icon={faDiscord} tone="discord" title="Discord" />
        <JoinLink href={invite} className="hidden @2xl:flex" />
      </div>

      {/* A failed refresh keeps showing the last good answer. */}
      {widget ? (
        <Presence widget={widget} />
      ) : isPending ? (
        <PresenceSkeleton />
      ) : (
        <div className="flex flex-col items-start gap-3">
          <p className="text-sm text-muted-foreground">Most nem sikerült betölteni a Discordot.</p>
          <Button variant="outline" onClick={() => refetch()} disabled={isFetching} className="h-11 px-4 md:h-9">
            <FontAwesomeIcon icon={faRotateRight} className={cn(isFetching && 'motion-safe:animate-spin')} aria-hidden="true" />
            {isFetching ? 'Próbálkozás…' : 'Újrapróbálás'}
          </Button>
        </div>
      )}

      {/* A narrow card keeps the button at the bottom: full width, and in thumb reach on phones. */}
      <JoinLink href={invite} className="mt-auto w-full @2xl:hidden" />
    </Panel>
  )
}

/** Opens the Discord invite. Tinted with Discord's blue, never filled with it: the page's strongest colour stays gold. */
function JoinLink({ href, className }: { href: string; className?: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={cn(
        'flex h-11 shrink-0 items-center justify-center gap-2 rounded-lg border border-discord/40 bg-discord/20 px-4 font-medium text-white transition-colors hover:bg-discord/30',
        'outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
        className,
      )}
    >
      <FontAwesomeIcon icon={faDiscord} className="size-5" aria-hidden="true" />
      Csatlakozás a Discordhoz
      <span className="sr-only"> (új lapon nyílik)</span>
    </a>
  )
}

function Presence({ widget }: { widget: DiscordWidget }) {
  // Only the channels the widget lists, the ones everyone may see: someone in
  // a private channel is never shown as sitting in voice.
  const channels = widget.channels.map((channel) => ({
    ...channel,
    members: widget.members.filter((member) => member.channel_id === channel.id),
  }))
  const inVoice = channels.reduce((count, channel) => count + channel.members.length, 0)

  return (
    <>
      <div className="shrink-0 border-b border-white/8 pb-4">
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <span aria-hidden="true" className="size-2 rounded-full bg-xp" />
          <span>
            <span className="font-semibold text-foreground tabular-nums">{countFormat.format(widget.presence_count)}</span> tag online
          </span>
        </p>
        {inVoice > 0 && <p className="mt-0.5 pl-4 text-xs text-muted-foreground">{countFormat.format(inVoice)} fő hangcsatornában</p>}
      </div>

      <ul aria-label="Hangcsatornák" className="grid gap-x-8 gap-y-1 @2xl:grid-cols-2 @4xl:grid-cols-3">
        {channels.map((channel) => {
          const occupied = channel.members.length > 0

          return (
            <li key={channel.id} className="min-w-0">
              <p className={cn('flex h-6 items-center gap-2 text-sm', occupied ? 'text-foreground' : 'text-muted-foreground')}>
                <FontAwesomeIcon
                  icon={faVolumeHigh}
                  className={cn('size-3.5 shrink-0', occupied ? 'text-xp' : 'text-muted-foreground/60')}
                  aria-hidden="true"
                />
                <span className="min-w-0 truncate">{channelLabel(channel.name)}</span>
                {occupied && (
                  <span className="ml-auto shrink-0 rounded-md bg-xp/15 px-1.5 text-xs leading-5 font-medium text-xp tabular-nums">
                    {channel.members.length}
                    <span className="sr-only"> fő</span>
                  </span>
                )}
              </p>
              {occupied && (
                <ul className="space-y-0.5 pb-1 pl-6">
                  {channel.members.slice(0, MEMBERS_SHOWN).map((member, index) => (
                    <li key={index} className="flex items-center gap-2 text-sm text-foreground">
                      <MemberAvatar member={member} className="size-5" />
                      <span className="min-w-0 truncate">{member.username}</span>
                    </li>
                  ))}
                  {channel.members.length > MEMBERS_SHOWN && (
                    <li className="pl-7 text-sm text-muted-foreground">+{channel.members.length - MEMBERS_SHOWN} további</li>
                  )}
                </ul>
              )}
            </li>
          )
        })}
      </ul>
    </>
  )
}

/** A channel's name without the emoji and separator the server puts in front ("🔊・Társalgó I"): the card draws its own icon. */
function channelLabel(name: string) {
  return name.replace(/^[^\p{L}\p{N}]+/u, '') || name
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

function PresenceSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-5 w-28" />
      <div className="space-y-2.5 border-t border-white/8 pt-4">
        {[28, 24, 26, 22, 24].map((width, row) => (
          <div key={row} className="flex items-center gap-2">
            <Skeleton className="size-3.5 rounded-sm" />
            <Skeleton className="h-4" style={{ width: width * 4 }} />
          </div>
        ))}
      </div>
      <span className="sr-only">A Discord betöltése…</span>
    </div>
  )
}
