import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { faEnvelope, faRotateRight } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { Logo } from '@/components/Logo'
import { ServerBackdrop } from '@/components/ServerBackdrop'
import { Button, buttonVariants } from '@/components/ui/button'
import { site } from '@/config/site'

type ErrorPageProps = {
  /** Asks again without reloading; without it the button reloads the page. */
  onRetry?: () => void
  retrying?: boolean
}

/**
 * Shown instead of the site when it cannot load: the server (or its database)
 * does not answer, or a page crashed. Uses nothing from the backend, so it
 * works while that is down.
 */
export function ErrorPage({ onRetry, retrying = false }: ErrorPageProps) {
  return (
    <div className="relative isolate flex min-h-dvh items-center justify-center bg-background px-4 py-10 sm:px-6">
      <title>{`Hiba | ${site.name}`}</title>
      <ServerBackdrop />

      <main className="card-rise glass flex w-full max-w-md flex-col items-center gap-6 p-8 text-center">
        <Logo />

        <div className="flex flex-col gap-2">
          <h1 className="font-heading text-3xl text-foreground">Valami hiba történt</h1>
          <p className="text-balance text-muted-foreground">
            Próbáld újra később, vagy vedd fel velünk a kapcsolatot.
          </p>
        </div>

        <div className="flex w-full flex-col gap-2">
          <Button size="lg" className="h-11" disabled={retrying} onClick={onRetry ?? (() => window.location.reload())}>
            <FontAwesomeIcon icon={faRotateRight} spin={retrying} aria-hidden="true" />
            {retrying ? 'Újrapróbálás…' : 'Újrapróbálás'}
          </Button>

          <a
            href={site.discordInviteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 border-discord/40 hover:bg-discord/15' })}
          >
            <FontAwesomeIcon icon={faDiscord} className="text-discord" aria-hidden="true" />
            Discord
            <span className="sr-only"> (új lapon nyílik)</span>
          </a>

          {site.contactEmail && (
            <a href={`mailto:${site.contactEmail}`} className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11' })}>
              <FontAwesomeIcon icon={faEnvelope} aria-hidden="true" />
              E-mail
            </a>
          )}
        </div>
      </main>
    </div>
  )
}
