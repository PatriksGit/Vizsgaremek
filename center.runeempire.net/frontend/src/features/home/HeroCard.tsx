import { Clock } from 'lucide-react'

import { useAccount } from '@/features/auth/queries'
import { enterAfter } from '@/lib/motion'

import { CubePlayer } from './CubePlayer'
import { registeredWithin, registrationDate } from './registration'
import { type Streak, StreakPanel } from './StreakPanel'

/**
 * The top of the overview, on a banner of the server's spawn: the greeting
 * and the player's name with the day they joined, this week's login streak,
 * and their figure. Wide screens (xl, beside the sidebar) keep the three side
 * by side; narrower ones put the streak under the name and the figure. A
 * player on their first day is welcomed, not welcomed back.
 */
export function HeroCard({ streak }: { streak?: Streak }) {
  const { data: account } = useAccount()
  const greeting = registeredWithin(account, 1) ? 'Üdv a birodalomban,' : 'Üdv újra a birodalomban,'

  return (
    <section
      aria-label="Üdvözlés"
      className="card-rise relative isolate flex flex-wrap items-center justify-between gap-x-3 gap-y-4 overflow-hidden rounded-2xl border border-border bg-card p-5.5 shadow-[inset_0_1px_0_rgb(255_255_255/0.04),0_1px_2px_rgb(0_0_0/0.35)] md:p-8 xl:min-h-57.5 xl:gap-6 xl:px-10"
    >
      <picture>
        <source media="(min-width: 768px)" srcSet="/backgrounds/hero-banner.webp" />
        <img
          src="/backgrounds/hero-banner-mobile.webp"
          alt=""
          className="pointer-events-none absolute inset-0 -z-20 size-full object-cover md:object-[center_40%]"
        />
      </picture>
      {/* Darkest behind the text: from the top on phones, from the left on wide screens. */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 -z-10 bg-linear-to-b from-background/55 via-background/60 to-background/90 xl:bg-linear-to-r xl:from-background/92 xl:via-background/60 xl:to-background/15"
      />

      <div className="content-in flex min-w-0 flex-[1_1_0] flex-col gap-1 md:gap-2 xl:basis-65" style={enterAfter(400)}>
        <p className="text-[13px] font-semibold text-muted-foreground">{greeting}</p>
        <h1 className="font-heading text-4xl leading-[1.05] font-bold tracking-tight wrap-break-word text-foreground md:text-[52px]">
          {account?.display_name}
        </h1>
        {account?.registered_at && (
          <>
            {/* Narrow: a plain line. */}
            <p className="text-xs text-muted-foreground xl:hidden">
              Csatlakozott: <strong className="text-foreground">{registrationDate.format(new Date(account.registered_at))}</strong>
            </p>
            <p className="mt-2 hidden h-7 items-center gap-1.5 self-start rounded-full bg-raised px-2.5 text-xs font-semibold text-soft xl:inline-flex">
              <Clock className="size-3.25" aria-hidden="true" />
              Csatlakozott: {registrationDate.format(new Date(account.registered_at))}
            </p>
          </>
        )}
      </div>

      <StreakPanel
        streak={streak}
        registeredAt={account?.registered_at}
        className="content-in order-last basis-full border-t border-line pt-4 xl:order-0 xl:mr-12 xl:shrink xl:grow-0 xl:basis-100 xl:border-t-0 xl:border-l xl:pt-0 xl:pl-8"
      />

      {/* 32 skin pixels at 6 px: 192 px on wide screens, 112 px on phones. */}
      <div aria-hidden="true" className="relative h-28 w-14 shrink-0 perspective-distant md:h-48 md:w-24">
        {/* Tipped a little towards the viewer, so the top of the head shows too. */}
        <div className="absolute bottom-1 left-1/2 origin-bottom transform-[rotateX(-14deg)] transform-3d max-md:scale-[0.58]">
          <CubePlayer scale={6} />
        </div>
      </div>
    </section>
  )
}
