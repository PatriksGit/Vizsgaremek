import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'

import { ServerStatus } from '@/components/ServerStatus'
import { site } from '@/config/site'
import { cn } from '@/lib/utils'

export type AuthMode = 'login' | 'register'

/**
 * The left half of the auth card: who we are and what the Center is for. It
 * is glass like the rest of the card, and stays the same while the forms slide.
 */
export function AuthShowcase({ className }: { className?: string }) {
  return (
    <aside
      className={cn('relative isolate flex flex-col gap-7 overflow-hidden bg-black/30 bg-cover bg-center p-6 sm:p-8', className)}
      style={site.authPanelImageUrl ? { backgroundImage: `url(${site.authPanelImageUrl})` } : undefined}
    >
      {site.authPanelImageUrl && (
        // Darkens the artwork so the text on it stays legible.
        <div
          aria-hidden="true"
          className="absolute inset-0 -z-10 bg-linear-to-t from-black/85 via-black/50 to-black/30"
        />
      )}

      {/* Not a link: leaving the auth page would lose what was typed in the forms. */}
      <div className="flex items-center gap-4 self-center">
        <img src={site.logoUrl} alt="" width={64} height={64} className="size-16" />
        <h1 className="font-heading text-3xl leading-none tracking-wide text-foreground">{site.name}</h1>
      </div>

      <ul className="flex flex-col gap-4 max-md:hidden">
        {site.centerIntro.map((item) => (
          <li key={item.title} className="flex items-start gap-3.5">
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

      <div className="mt-auto self-center rounded-full border border-white/10 bg-black/30 px-4 py-2 max-md:hidden">
        <ServerStatus />
      </div>
    </aside>
  )
}
