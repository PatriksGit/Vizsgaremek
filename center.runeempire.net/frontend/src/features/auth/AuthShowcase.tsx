import { Link } from 'react-router'

import { ServerStatus } from '@/components/ServerStatus'
import { site } from '@/config/site'
import { cn } from '@/lib/utils'

import { RuneInscription } from './RuneInscription'

export type AuthMode = 'login' | 'register'

const HEADLINES: Record<AuthMode, { title: string; text: string }> = {
  login: {
    title: 'A birodalom vár rád.',
    text: 'Lépj be, és folytasd ott, ahol abbahagytad.',
  },
  register: {
    title: 'Foglald le a neved.',
    text: 'Ezzel a névvel és jelszóval lépsz be a szerveren is.',
  },
}

type AuthShowcaseProps = {
  mode: AuthMode
  /** The name typed in the active form, carved in runes. */
  name: string
  className?: string
}

/**
 * The emblem half of the auth card. It is glass like the rest of the card, so
 * the page background shows through; it stays put while the forms slide.
 */
export function AuthShowcase({ mode, name, className }: AuthShowcaseProps) {
  const headline = HEADLINES[mode]

  return (
    <aside
      className={cn(
        'relative isolate flex flex-col items-center gap-6 overflow-hidden bg-black/20 bg-cover bg-center p-6 text-center sm:p-10',
        className,
      )}
      style={site.authPanelImageUrl ? { backgroundImage: `url(${site.authPanelImageUrl})` } : undefined}
    >
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 -z-10',
          site.authPanelImageUrl
            ? 'bg-linear-to-t from-black/85 via-black/35 to-black/10'
            : 'bg-[radial-gradient(45%_32%_at_50%_26%,rgb(92_200_255/0.16),transparent_75%)]',
        )}
      />

      <Link
        to="/"
        className="flex flex-col items-center gap-4 rounded-2xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <img
          src={site.logoUrl}
          alt=""
          width={208}
          height={208}
          className="size-28 drop-shadow-[0_0_36px_rgb(92_200_255/0.3)] md:size-48 lg:size-52"
        />
        <span className="flex flex-col gap-1.5">
          <span className="font-heading text-3xl leading-none tracking-wide text-foreground">{site.name}</span>
          <span className="text-sm text-muted-foreground">Magyar survival birodalom</span>
        </span>
      </Link>

      <div className="mt-auto flex w-full flex-col items-center gap-6">
        <RuneInscription name={name} className="w-full max-md:hidden" />

        {/* Keyed so the copy fades in again when the form changes. */}
        <div key={mode} className="animate-in fade-in slide-in-from-bottom-2 duration-700 motion-reduce:animate-none">
          <h1 className="font-heading text-4xl leading-[1.05] text-balance text-foreground drop-shadow-[0_2px_12px_rgb(0_0_0/0.6)] lg:text-5xl">
            {headline.title}
          </h1>
          <p className="mt-3 text-foreground/80 max-md:hidden">{headline.text}</p>
        </div>

        <div className="rounded-full border border-white/10 bg-black/30 px-4 py-2 max-md:hidden">
          <ServerStatus />
        </div>
      </div>
    </aside>
  )
}
