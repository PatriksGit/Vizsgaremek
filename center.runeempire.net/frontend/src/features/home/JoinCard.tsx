import { faDownload, faGamepad } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { IconBadge } from '@/components/app/IconBadge'
import { Panel } from '@/components/app/Panel'
import { SoonButton } from '@/components/app/SoonButton'
import { buttonVariants } from '@/components/ui/button'
import { site } from '@/config/site'
import { enterAfter } from '@/lib/motion'

/** How a new player gets into the game: the client, and the same name and password as here. */
export function JoinCard() {
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
          </p>
        </div>
      </div>
      {site.clientDownloadUrl ? (
        <a href={site.clientDownloadUrl} className={buttonVariants({ size: 'lg', className: 'h-11 shrink-0 self-start px-4 md:self-auto' })}>
          <FontAwesomeIcon icon={faDownload} aria-hidden="true" />
          Kliens letöltése
        </a>
      ) : (
        <div className="shrink-0 self-start md:self-auto">
          <SoonButton icon={faDownload}>Kliens letöltése</SoonButton>
        </div>
      )}
    </Panel>
  )
}
