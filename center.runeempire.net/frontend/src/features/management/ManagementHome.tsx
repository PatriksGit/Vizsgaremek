import { faChevronRight, faClockRotateLeft, faUsers, type IconDefinition } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router'

import { IconBadge } from '@/components/app/IconBadge'
import { panelLook } from '@/components/app/Panel'
import { site } from '@/config/site'
import { MANAGEMENT_NAV, MANAGEMENT_PAGES } from '@/features/app/nav'
import { blurAfterPointerClick } from '@/lib/focus'
import { enterAfter, staggerDelay } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** The tools (owner, 2026-11-26). No "Hamarosan" cards for later ones: the examiners see the live site. */
const TOOLS: { label: string; icon: IconDefinition; to: string; description: string }[] = [
  {
    label: 'Játékosok',
    icon: faUsers,
    to: MANAGEMENT_PAGES.players,
    description: 'Keresés név, IP-cím vagy e-mail alapján; e-mail-csere és a 2FA kikapcsolása.',
  },
  {
    label: 'Napló',
    icon: faClockRotateLeft,
    to: MANAGEMENT_PAGES.log,
    description: 'Minden staff-művelet: ki, kin, mit és mikor csinált.',
  },
]

/**
 * /management once signed in (owner, 2026-11-26): only the tool cards, in the
 * look of a menu group's landing page (SectionPage); no visible title, and the
 * logout lives in the account menu.
 */
export function ManagementHome() {
  return (
    <section className="flex flex-col gap-5">
      <title>{`${MANAGEMENT_NAV.label} | ${site.name}`}</title>
      <h1 className="sr-only">{MANAGEMENT_NAV.label}</h1>

      <ul className="grid gap-4 sm:grid-cols-2">
        {TOOLS.map((tool, index) => (
          <li key={tool.to} className="content-in" style={enterAfter(100 + staggerDelay(index, 70))}>
            <Link
              to={tool.to}
              onClick={blurAfterPointerClick}
              className={cn(
                panelLook,
                'group flex h-full items-center gap-4 transition-colors hover:border-primary/30',
                'outline-none focus-visible:ring-2 focus-visible:ring-primary/50',
              )}
            >
              <IconBadge icon={tool.icon} />
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="font-heading text-xl text-foreground">{tool.label}</span>
                <span className="text-sm text-balance text-muted-foreground">{tool.description}</span>
              </span>
              <FontAwesomeIcon
                icon={faChevronRight}
                className="size-3.5 text-muted-foreground transition-colors group-hover:text-primary"
                aria-hidden="true"
              />
            </Link>
          </li>
        ))}
      </ul>
    </section>
  )
}
