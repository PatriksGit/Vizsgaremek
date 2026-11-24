import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { faGamepad } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { IconBadge } from '@/components/app/IconBadge'
import { Panel } from '@/components/app/Panel'
import { buttonVariants } from '@/components/ui/button'
import { site } from '@/config/site'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

/**
 * How a new player gets into the game: the same name in Minecraft, and the
 * same password typed into the server's /login. The card ends on the Discord,
 * where the news are.
 */
export function JoinCard() {
  return (
    <Panel
      as="section"
      aria-labelledby="join-title"
      className="content-in flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between"
      style={enterAfter(500)}
    >
      <div className="flex items-start gap-3">
        <IconBadge icon={faGamepad} />
        <div>
          <h2 id="join-title" className="font-heading text-xl text-foreground">
            Így csatlakozol a szerverhez
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Lépj fel a szerverre azzal a játékosnévvel, amivel itt regisztráltál, és írd be:{' '}
            <code className="rounded bg-raised px-1.5 py-0.5 font-mono text-foreground">/login &lt;jelszavad&gt;</code>, ugyanazzal a
            jelszóval, mint itt.
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        <a
          href={site.discordInviteUrl}
          target="_blank"
          rel="noopener noreferrer"
          // cn, not buttonVariants' className: only tailwind-merge lets the Discord hover beat the outline's hover:bg-muted (UX-1).
          className={cn(buttonVariants({ variant: 'outline', size: 'lg' }), 'h-11 border-discord/40 px-4 hover:bg-discord/15')}
        >
          <FontAwesomeIcon icon={faDiscord} className="text-discord" aria-hidden="true" />
          Csatlakozás a Discordhoz
          <span className="sr-only"> (új lapon nyílik)</span>
        </a>
      </div>
    </Panel>
  )
}
