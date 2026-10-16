import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { ServerStatus } from '@/components/ServerStatus'
import { site } from '@/config/site'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

/** When the intro blocks start arriving, and the gap between them (ms). */
const STAGGER_START = 520
const STAGGER_STEP = 70
const statusEntersAt = STAGGER_START + site.centerIntro.length * STAGGER_STEP

/**
 * The left half of the auth card: who we are and what the Center is for. It
 * is glass like the rest of the card, and stays the same while the forms slide.
 */
export function AuthShowcase({ className }: { className?: string }) {
  return (
    <aside
      className={cn('flex flex-col gap-7 overflow-hidden p-6 sm:p-8 md:bg-black/30', className)}
    >

      {/* Not a link: leaving the auth page would lose what was typed in the forms. */}
      <div className="content-in flex items-center gap-4 self-center" style={enterAfter(450)}>
        <img src={site.logoUrl} alt="" width={64} height={64} className="size-16" />
        <h1 className="font-heading text-3xl leading-none tracking-wide text-foreground">{site.name}</h1>
      </div>

      {/* Phones skip the intro below; this one fact is the one a new player must not miss. */}
      <p className="-mt-2 text-center text-sm text-muted-foreground md:hidden">
        Ugyanazzal a névvel és jelszóval lépsz be a játékba is.
      </p>

      <ul className="flex flex-col gap-4 max-md:hidden">
        {site.centerIntro.map((item, index) => (
          <li key={item.title} className="content-in flex items-start gap-3.5" style={enterAfter(STAGGER_START + index * STAGGER_STEP)}>
            <span className="grid size-10 shrink-0 place-items-center rounded-lg border border-primary/25 bg-black/40 text-primary shadow-[inset_0_1px_0_rgb(255_255_255/0.06)]">
              <FontAwesomeIcon icon={item.icon} className="size-4" aria-hidden="true" />
            </span>
            <span className="flex flex-col gap-0.5">
              <span className="font-semibold text-foreground">{item.title}</span>
              <span className="text-sm leading-snug text-muted-foreground">{item.text}</span>
            </span>
          </li>
        ))}
      </ul>

      <div className="content-in mt-auto self-center max-md:hidden" style={enterAfter(statusEntersAt)}>
        <ServerStatus countAfter={statusEntersAt} />
      </div>
    </aside>
  )
}
