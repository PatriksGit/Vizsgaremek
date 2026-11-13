import { Clock } from 'lucide-react'

import { useAccount } from '@/features/auth/queries'
import { enterAfter } from '@/lib/motion'

import { registeredWithin, registrationDate } from './registration'
import { SkinFigure } from './SkinFigure'
import { type Streak, StreakPanel } from './StreakPanel'

/**
 * The top of the overview, on a banner of the server's spawn: the greeting,
 * the player's name and the day they joined on the left, their skin as a 3D
 * figure to the right of the name (the middle of the card on wide screens),
 * and this week's login streak in a small box of its own on the right
 * (under them on narrower screens). A player on their first day is
 * welcomed, not welcomed back.
 */
export function HeroCard({ streak }: { streak?: Streak | null }) {
  const { data: account } = useAccount()
  const greeting = registeredWithin(account, 1) ? 'Üdv a birodalomban,' : 'Üdv újra a birodalomban,'

  return (
    <section
      aria-label="Üdvözlés"
      className="card-rise relative isolate flex flex-wrap items-center justify-between gap-4 overflow-hidden rounded-2xl border border-border bg-card p-5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_1px_2px_rgb(0_0_0/0.35)] md:px-6 md:py-6 xl:min-h-57.5 xl:gap-6 xl:pr-8"
    >
      {/* In a layer of its own: a bare <picture> (its <source>) would take a slot in the row and push the name inwards. */}
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-20">
        <picture>
          <source media="(min-width: 768px)" srcSet="/backgrounds/hero-banner.webp" />
          <img src="/backgrounds/hero-banner-mobile.webp" alt="" className="size-full object-cover md:object-[center_40%]" />
        </picture>
      </div>
      {/* Darkest behind the text: from the top on phones, from the left on wide screens. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-background/55 via-background/60 to-background/90 xl:bg-linear-to-r xl:from-background/92 xl:via-background/60 xl:to-background/30"
      />

      <div className="content-in flex min-w-0 flex-[1_1_0] flex-col gap-1 md:gap-2 xl:flex-none" style={enterAfter(400)}>
        <p className="text-[13px] font-semibold text-muted-foreground">{greeting}</p>
        <h1 className="font-heading text-4xl leading-[1.05] font-bold tracking-tight wrap-break-word text-foreground md:text-[52px]">
          {account?.display_name}
        </h1>
        {account?.registered_at && (
          <>
            {/* Phones: a plain line. */}
            <p className="text-xs text-muted-foreground md:hidden">
              Csatlakozott: <strong className="text-foreground">{registrationDate.format(new Date(account.registered_at))}</strong>
            </p>
            <p className="mt-2 hidden h-7 items-center gap-1.5 self-start rounded-full bg-raised px-2.5 text-xs font-semibold text-soft md:inline-flex">
              <Clock className="size-3.25" aria-hidden="true" />
              Csatlakozott: {registrationDate.format(new Date(account.registered_at))}
            </p>
          </>
        )}
      </div>

      <SkinFigure name={account?.display_name} />

      <StreakPanel
        streak={streak}
        className="content-in basis-full rounded-xl border border-line bg-background/65 p-4 backdrop-blur-sm xl:shrink-0 xl:basis-96"
      />
    </section>
  )
}
