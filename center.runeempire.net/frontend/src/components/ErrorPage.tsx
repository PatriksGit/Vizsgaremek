import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope, faExclamation } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { Logo } from '@/components/Logo'
import { buttonVariants } from '@/components/ui/button'
import { site } from '@/config/site'
import { cn } from '@/lib/utils'

type ErrorPageProps = {
  /**
   * The HTTP status the site's session check failed with; 0 when no answer came at all
   * (a dropped connection, a timeout); none when the page itself crashed.
   */
  status?: number
}

/** The statuses a proxy or a maintenance answers with: the server is not there, rather than broken. */
const UNAVAILABLE = [502, 503, 504, 530]

/** What the page says for a status, and the code it shows large on top (none without a status). */
function describe(status: number | undefined): { title: string; text: string; code: number | null } {
  if (status === 0) {
    return { title: 'Nem sikerült csatlakozni', text: 'Ellenőrizd az internetkapcsolatod, aztán frissítsd az oldalt.', code: null }
  }
  if (status !== undefined && UNAVAILABLE.includes(status)) {
    return { title: 'A szerver most nem érhető el', text: 'Karbantartás vagy átmeneti kiesés. Frissítsd az oldalt pár perc múlva.', code: status }
  }
  return { title: 'Valami hiba történt', text: 'Frissítsd az oldalt pár perc múlva, vagy szólj nekünk Discordon.', code: status ?? null }
}

/**
 * Shown instead of the site when it cannot load: the server (or its database) does not answer,
 * or a page crashed. Like Pterodactyl's (owner, 2026-11-17): the status code large on top, one
 * line of what happened, and how to reach us -- on the site's dark background, no card. No retry
 * button: a page refresh asks again. "Hibakód: N" is there to quote on Discord. Uses nothing from
 * the backend, so it works while that is down.
 */
export function ErrorPage({ status }: ErrorPageProps) {
  const { title, text, code } = describe(status)

  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-4 py-10 text-center">
      <title>{`Hiba | ${site.name}`}</title>

      <main className="flex w-full max-w-md flex-col items-center gap-5">
        <Logo />

        {code !== null ? (
          <p className="font-heading text-[88px] leading-[0.9] font-extrabold tracking-tight text-primary sm:text-[140px]">{code}</p>
        ) : (
          <span
            aria-hidden="true"
            className="flex size-24 items-center justify-center rounded-full border-4 border-danger/40 text-danger"
          >
            <FontAwesomeIcon icon={faExclamation} className="size-10" />
          </span>
        )}

        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl text-foreground">{title}</h1>
          <p className="text-balance text-muted-foreground">{text}</p>
        </div>

        <div className="flex flex-wrap justify-center gap-3">
          <a
            href={site.discordInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            // cn, not buttonVariants' className: only tailwind-merge lets bg-discord beat the default bg-primary.
            className={cn(buttonVariants({ size: 'lg' }), 'h-11 bg-discord px-5 text-white hover:bg-discord/85')}
          >
            <FontAwesomeIcon icon={faDiscord} aria-hidden="true" />
            Discord
            <span className="sr-only"> (új lapon nyílik)</span>
          </a>

          {site.contactEmail && (
            <a href={`mailto:${site.contactEmail}`} className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 px-5' })}>
              <FontAwesomeIcon icon={faEnvelope} aria-hidden="true" />
              E-mail
            </a>
          )}
        </div>

        {code !== null && <p className="text-xs font-semibold text-faint">Hibakód: {code}</p>}
      </main>
    </div>
  )
}
