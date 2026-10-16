import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import { faDownload, faGamepad } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { IconBadge } from '@/components/app/IconBadge'
import { Panel } from '@/components/app/Panel'
import { SoonButton } from '@/components/app/SoonButton'
import { buttonVariants } from '@/components/ui/button'
import { site } from '@/config/site'
import { enterAfter } from '@/lib/motion'

/**
 * How a new player gets into the game: the client, and the same name and
 * password as here. While the client cannot be downloaded yet, the card still
 * ends on something that works: the Discord, where its release is announced.
 */
export function JoinCard() {
  const clientReady = site.clientDownloadUrl !== null

  return (
    <Panel
      as="section"
      aria-labelledby="join-title"
      className="content-in flex flex-col gap-4 md:flex-row md:items-center md:justify-between"
      style={enterAfter(500)}
    >
      <div className="flex items-start gap-3">
        <IconBadge icon={faGamepad} tone="gold" />
        <div>
          <h2 id="join-title" className="font-heading text-xl text-foreground">
            Így csatlakozol a szerverhez
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground">
            Töltsd le a RuneEmpire klienst, és lépj be ugyanazzal a játékosnévvel és jelszóval, amivel itt regisztráltál.
            {!clientReady && ' A kliens hamarosan letölthető: a Discordon szólunk, amint elérhető.'}
          </p>
        </div>
      </div>

      <div className="flex shrink-0 flex-wrap gap-2">
        {site.clientDownloadUrl ? (
          <a href={site.clientDownloadUrl} className={buttonVariants({ size: 'lg', className: 'h-11 px-4' })}>
            <FontAwesomeIcon icon={faDownload} aria-hidden="true" />
            Kliens letöltése
          </a>
        ) : (
          <>
            <a
              href={site.discordInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
              className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 border-discord/40 px-4 hover:bg-discord/15' })}
            >
              <FontAwesomeIcon icon={faDiscord} className="text-discord" aria-hidden="true" />
              Csatlakozás a Discordhoz
              <span className="sr-only"> (új lapon nyílik)</span>
            </a>
            <SoonButton icon={faDownload}>Kliens letöltése</SoonButton>
          </>
        )}
      </div>
    </Panel>
  )
}
