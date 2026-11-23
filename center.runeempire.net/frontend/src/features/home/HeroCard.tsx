import { Clock } from 'lucide-react'

import { FitLine } from '@/components/app/FitLine'
import { enterAfter } from '@/lib/motion'

import { joinedDay } from './registration'
import { SkinFigure } from './SkinFigure'
import { type Streak, StreakPanel, type StreakText } from './StreakPanel'

/**
 * The top of the overview, on a banner of the server's spawn: the greeting,
 * the player's name and the day they joined on the left, their skin as a 3D
 * figure to the right of the name (the middle of the card on wide screens),
 * and this week's login streak in a small box of its own on the right
 * (under them on narrower screens). The same card tops another player's
 * profile, with a line naming the page instead of the greeting.
 */
export function HeroCard({
  label,
  greeting,
  name,
  registeredAt,
  streak,
  streakText,
  asOf,
}: {
  /** The card's name for screen readers (wording.ts). */
  label: string
  /** The small line above the name. */
  greeting: string
  name?: string
  registeredAt?: string | null
  streak?: Streak | null
  /** The streak boxes' words to or about the player (wording.ts). */
  streakText: StreakText
  asOf?: Date
}) {
  return (
    <section
      aria-label={label}
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
        {/* A Minecraft name is one word: never broken mid-word ("ClaudeTes / zt"), it shrinks to the column (V1). */}
        <h1 className="font-heading text-4xl leading-[1.05] font-bold tracking-tight text-foreground md:text-[52px]">
          <FitLine>{name}</FitLine>
        </h1>
        {registeredAt && (
          <>
            {/* Phones: a plain line. */}
            <p className="text-xs text-muted-foreground md:hidden">
              Csatlakozott: <strong className="whitespace-nowrap text-foreground">{joinedDay(registeredAt)}</strong>
            </p>
            {/* At most one break, between the label and the date (a narrow column at 768 px), and it grows with it (V1). */}
            <p className="mt-2 hidden min-h-7 items-center gap-1.5 self-start rounded-full bg-raised px-2.5 py-1 text-xs font-semibold text-soft md:inline-flex">
              <Clock className="size-3.25 shrink-0" aria-hidden="true" />
              <span>
                Csatlakozott: <span className="whitespace-nowrap">{joinedDay(registeredAt)}</span>
              </span>
            </p>
          </>
        )}
      </div>

      <SkinFigure name={name} />

      <StreakPanel
        streak={streak}
        text={streakText}
        asOf={asOf}
        className="content-in basis-full rounded-xl border border-line bg-background/65 p-4 backdrop-blur-sm xl:shrink-0 xl:basis-96"
      />
    </section>
  )
}
