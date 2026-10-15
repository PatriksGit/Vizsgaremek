import { faDiscord } from '@fortawesome/free-brands-svg-icons'
import {
  faBan,
  faCartShopping,
  faCircleCheck,
  faClock,
  faFire,
  faGem,
  faHouse,
  faRightFromBracket,
  faTrophy,
  faUserGear,
  type IconDefinition,
} from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Fragment, useState } from 'react'

import { ServerBackdrop } from '@/components/ServerBackdrop'
import { Popover, PopoverContent, PopoverDescription, PopoverTitle, PopoverTrigger } from '@/components/ui/popover'
import { site } from '@/config/site'
import { enterAfter } from '@/lib/motion'
import { cn } from '@/lib/utils'

import { CubePlayer } from './CubePlayer'

/*
 * THROWAWAY: a mockup of the logged-in home page with sample data, to agree on
 * the look before the real page is built. Delete together with its route.
 */

const NAV: { icon: IconDefinition; label: string; active?: boolean }[] = [
  { icon: faHouse, label: 'Áttekintés', active: true },
  { icon: faCartShopping, label: 'Webshop' },
  { icon: faTrophy, label: 'Ranglisták' },
  { icon: faUserGear, label: 'Fiók és biztonság' },
]

const WEEK = [
  { day: 'H', hours: 1.5 },
  { day: 'K', hours: 3 },
  { day: 'Sze', hours: 2.2 },
  { day: 'Cs', hours: 4.6 },
  { day: 'P', hours: 6 },
  { day: 'Szo', hours: 7.8, today: true },
  { day: 'V', hours: 5 },
]

const glass = 'rounded-3xl border border-white/10 bg-black/55 shadow-[0_30px_80px_-20px_rgb(0_0_0/0.8),inset_0_1px_0_rgb(255_255_255/0.08)] backdrop-blur-xl'

export function HomeMockup() {
  return (
    <div className="relative isolate min-h-dvh bg-background">
      <title>{`Áttekintés | ${site.name}`}</title>
      <style>{`@keyframes spin-y { to { transform: rotateY(360deg) } }`}</style>
      <ServerBackdrop />
      {/* The dashboard sits further back than the login card: more blur, more dark. */}
      <div aria-hidden="true" className="absolute inset-0 -z-10 bg-black/45 backdrop-blur-sm" />

      <Rail />

      <main className="mx-auto grid max-w-7xl gap-5 px-4 pt-6 pb-28 sm:px-6 md:pl-28 md:pb-10 lg:min-h-dvh lg:grid-cols-[minmax(0,22rem)_1fr] lg:grid-rows-[auto_1fr_auto] lg:pr-8">
        <p className="content-in col-span-full justify-self-end rounded-full border border-primary/30 bg-black/50 px-3 py-1 text-xs text-primary" style={enterAfter(200)}>
          Mockup, példaadatokkal
        </p>

        <SkinStage />

        <div className="flex min-w-0 flex-col gap-5">
          <ProfileCard />
          <div className="grid flex-1 gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
            <PlaytimeCard />
            <DiscordCard />
          </div>
        </div>

        <ServerStrip />
      </main>
    </div>
  )
}

/** Icon rail that opens over the content to show its labels. */
function Rail() {
  return (
    <>
      <nav
        aria-label="Főmenü"
        className={cn(
          'group/rail fixed inset-y-4 left-4 z-20 hidden w-16 flex-col overflow-hidden py-4 transition-[width] duration-300 ease-out hover:w-60 focus-within:w-60 md:flex',
          glass,
        )}
      >
        <div className="flex items-center gap-3 px-3">
          <img src={site.logoUrl} alt="" width={40} height={40} className="size-10 shrink-0" />
          <span className="font-heading text-xl whitespace-nowrap text-foreground opacity-0 transition-opacity group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
            {site.name}
          </span>
        </div>

        <ul className="mt-8 flex flex-col gap-1 px-2">
          {NAV.map((item) => (
            <li key={item.label}>
              <a
                href="#"
                aria-current={item.active ? 'page' : undefined}
                className={cn(
                  'flex h-11 items-center gap-4 rounded-xl px-3 whitespace-nowrap outline-none transition-colors focus-visible:ring-3 focus-visible:ring-ring/50',
                  item.active ? 'bg-primary/15 text-primary' : 'text-muted-foreground hover:bg-white/5 hover:text-foreground',
                )}
              >
                <FontAwesomeIcon icon={item.icon} className="size-4.5 shrink-0" aria-hidden="true" />
                <span className="opacity-0 transition-opacity group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">{item.label}</span>
              </a>
            </li>
          ))}
        </ul>

        <div className="mt-auto flex flex-col gap-1 px-2">
          <div className="flex h-12 items-center gap-3 px-1.5 whitespace-nowrap">
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-[#c08a5c] font-heading text-sm text-[#4a3220]">P</span>
            <span className="opacity-0 transition-opacity group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">
              <span className="block text-sm text-foreground">PatrikT</span>
              <span className="block text-xs text-muted-foreground">VIP+</span>
            </span>
          </div>
          <button
            type="button"
            className="flex h-11 items-center gap-4 rounded-xl px-3 whitespace-nowrap text-muted-foreground outline-none transition-colors hover:bg-white/5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            <FontAwesomeIcon icon={faRightFromBracket} className="size-4.5 shrink-0" aria-hidden="true" />
            <span className="opacity-0 transition-opacity group-hover/rail:opacity-100 group-focus-within/rail:opacity-100">Kijelentkezés</span>
          </button>
        </div>
      </nav>

      {/* Phones: the same entries as a bottom bar. */}
      <nav aria-label="Főmenü" className={cn('fixed inset-x-3 bottom-3 z-20 flex justify-around p-2 md:hidden', glass)}>
        {NAV.map((item) => (
          <a
            key={item.label}
            href="#"
            aria-label={item.label}
            aria-current={item.active ? 'page' : undefined}
            className={cn(
              'grid size-11 place-items-center rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50',
              item.active ? 'bg-primary/15 text-primary' : 'text-muted-foreground',
            )}
          >
            <FontAwesomeIcon icon={item.icon} className="size-5" aria-hidden="true" />
          </a>
        ))}
      </nav>
    </>
  )
}

/** The memorable part: the player's figure turning on a glowing rune ring. */
function SkinStage() {
  return (
    <section
      aria-label="A karaktered"
      className={cn('card-rise relative flex min-h-120 flex-col items-center justify-end overflow-hidden lg:min-h-136', glass)}
    >
      {/* Light rising from the ring. */}
      <div aria-hidden="true" className="absolute inset-x-0 bottom-0 h-2/3 bg-[radial-gradient(50%_60%_at_50%_100%,rgb(242_181_68/0.28),transparent_70%)]" />

      <div className="relative mb-20 perspective-[900px]">
        <div className="transform-[rotateX(-8deg)] transform-3d">
          <CubePlayer />
        </div>
      </div>

      {/* The rune ring the figure stands on. */}
      <div aria-hidden="true" className="absolute bottom-14 h-16 w-60 rounded-[50%] border border-primary/50 shadow-[0_0_40px_rgb(242_181_68/0.35),inset_0_0_30px_rgb(242_181_68/0.25)]" />
      <div aria-hidden="true" className="absolute bottom-18 h-8 w-40 rounded-[50%] border border-dashed border-primary/30" />

      <p className="relative z-10 mb-4 text-sm text-muted-foreground">A skined a szerverről, valós időben</p>
    </section>
  )
}

function ProfileCard() {
  const stats: { icon: IconDefinition; value: string; label: string }[] = [
    { icon: faGem, value: '1 000', label: 'rúna' },
    { icon: faClock, value: '300', label: 'óra a szerveren' },
    { icon: faFire, value: '12', label: 'napos sorozat' },
  ]

  return (
    <section className={cn('card-rise flex flex-col gap-6 p-6 sm:p-8', glass)}>
      <div className="content-in flex flex-wrap items-end gap-x-5 gap-y-3" style={enterAfter(400)}>
        <h1 className="font-heading text-5xl leading-none text-foreground sm:text-6xl">PatrikT</h1>
        <p className="flex items-center gap-2 pb-1 text-sm text-muted-foreground">
          <span className="rounded-md border border-primary/40 bg-primary/10 px-2 py-0.5 font-semibold text-primary">VIP+</span>
          lejár november 4-én
        </p>
      </div>

      <ul className="content-in flex flex-wrap gap-x-10 gap-y-4" style={enterAfter(520)}>
        {stats.map((stat) => (
          <li key={stat.label} className="flex items-center gap-3">
            <FontAwesomeIcon icon={stat.icon} className="size-4 text-primary" aria-hidden="true" />
            <span>
              <span className="font-heading text-3xl leading-none text-foreground tabular-nums">{stat.value}</span>{' '}
              <span className="text-muted-foreground">{stat.label}</span>
            </span>
          </li>
        ))}
        <li className="flex items-center text-sm text-muted-foreground">Leghosszabb sorozatod: 27 nap</li>
      </ul>
    </section>
  )
}

function PlaytimeCard() {
  const max = Math.max(...WEEK.map((day) => day.hours))
  const total = WEEK.reduce((sum, day) => sum + day.hours, 0)

  return (
    <section className={cn('content-in flex flex-col gap-6 p-6', glass)} style={enterAfter(640)}>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2 className="font-heading text-2xl text-foreground">Játékidő az elmúlt héten</h2>
        <p className="text-sm text-muted-foreground">
          <span className="font-heading text-xl text-foreground">{Math.round(total)} óra</span>, napi átlag {(total / 7).toFixed(1).replace('.', ',')}
        </p>
      </div>

      <ol className="grid min-h-48 flex-1 grid-cols-7 items-end gap-3">
        {WEEK.map((day) => (
          <li key={day.day} className="flex h-full flex-col items-center justify-end gap-2">
            <span className={cn('text-xs tabular-nums', day.today ? 'text-primary' : 'text-muted-foreground')}>
              {day.hours.toString().replace('.', ',')}
            </span>
            <span
              className={cn(
                'w-full max-w-10 rounded-t-md',
                day.today ? 'bg-primary shadow-[0_0_18px_rgb(242_181_68/0.45)]' : 'bg-white/12',
              )}
              style={{ height: `${(day.hours / max) * 100}%` }}
            />
            <span className={cn('text-sm', day.today ? 'font-semibold text-foreground' : 'text-muted-foreground')}>{day.day}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/** The official Discord widget, loaded only on request: it is a third-party page with its own cookies. */
function DiscordCard() {
  const [loaded, setLoaded] = useState(false)

  return (
    <section className={cn('content-in flex flex-col gap-4 p-6', glass)} style={enterAfter(760)}>
      <h2 className="flex items-center gap-3 font-heading text-2xl text-foreground">
        <FontAwesomeIcon icon={faDiscord} className="size-5 text-[#8b93f8]" aria-hidden="true" />
        Discord
      </h2>

      {loaded ? (
        <div className="grid min-h-64 flex-1 place-items-center rounded-xl border border-dashed border-white/15 p-4 text-center text-sm text-muted-foreground">
          Ide töltődik be a Discord hivatalos widgetje (kell hozzá a szerver ID).
        </div>
      ) : (
        <div className="flex flex-1 flex-col gap-4">
          <p className="text-sm leading-relaxed text-muted-foreground">
            Nézd meg, ki van fent a közösségből. A widget a Discord oldaláról töltődik be.
          </p>
          <p className="flex items-center gap-2 text-sm text-foreground">
            <span className="size-2 rounded-full bg-xp shadow-[0_0_8px_var(--xp)]" aria-hidden="true" />
            412 tag online
          </p>
          <button
            type="button"
            onClick={() => setLoaded(true)}
            className="mt-auto h-10 rounded-lg bg-[#5865f2] font-semibold text-white outline-none transition-colors hover:bg-[#4752c4] focus-visible:ring-3 focus-visible:ring-ring/50"
          >
            Discord betöltése
          </button>
        </div>
      )}
    </section>
  )
}

/** The server's state, as one quiet strip instead of a row of identical cards. */
function ServerStrip() {
  return (
    <section
      aria-label="A szerver"
      className={cn('content-in col-span-full grid divide-white/10 px-6 py-4 sm:grid-cols-3 sm:divide-x max-sm:divide-y', glass)}
      style={enterAfter(880)}
    >
      <p className="flex items-center gap-3 py-2 sm:pr-6">
        <span className="size-2 rounded-full bg-xp shadow-[0_0_8px_var(--xp)]" aria-hidden="true" />
        <span>
          <span className="font-heading text-xl text-foreground tabular-nums">287</span>
          <span className="text-muted-foreground"> játékos online, 500 hely</span>
        </span>
      </p>
      <div className="flex items-center py-2 sm:px-6">
        <PunishmentStatus />
      </div>
      <p className="py-2 text-muted-foreground sm:pl-6">
        Regisztráltál: <span className="text-foreground">2024. március 18.</span>
      </p>
    </section>
  )
}

/** Sample active ban, to show the warning state; without one the line reads "Nincs aktív büntetésed". */
const SAMPLE_BAN = [
  { term: 'Kitiltott', detail: 'Bence (moderátor)' },
  { term: 'Indok', detail: 'X-ray használata' },
  { term: 'Kezdete', detail: 'október 12., 21:40' },
  { term: 'Lejár', detail: 'október 22., 21:40 (7 nap múlva)' },
]

/**
 * The punishment line. With an active one, the details open on hover, and on
 * tap or Enter too, so phones and keyboards reach them as well.
 */
function PunishmentStatus() {
  const [banned, setBanned] = useState(true)

  if (!banned) {
    return (
      <button type="button" onClick={() => setBanned(true)} className="flex items-center gap-3 text-foreground">
        <FontAwesomeIcon icon={faCircleCheck} className="size-4 text-xp" aria-hidden="true" />
        Nincs aktív büntetésed
      </button>
    )
  }

  return (
    <Popover>
      <PopoverTrigger
        openOnHover
        delay={100}
        className="flex items-center gap-3 rounded-lg text-destructive outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
      >
        <FontAwesomeIcon icon={faBan} className="size-4" aria-hidden="true" />
        <span className="underline decoration-destructive/40 decoration-dotted underline-offset-4">Ki vagy tiltva, még 7 napig</span>
      </PopoverTrigger>
      <PopoverContent side="top" sideOffset={10} className="w-80 gap-4 rounded-2xl border border-destructive/30 bg-black/85 p-5 ring-0 backdrop-blur-xl">
        <PopoverTitle className="font-heading text-xl text-foreground">Ideiglenes kitiltás</PopoverTitle>
        <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
          {SAMPLE_BAN.map((row) => (
            <Fragment key={row.term}>
              <dt className="text-muted-foreground">{row.term}</dt>
              <dd className="text-foreground">{row.detail}</dd>
            </Fragment>
          ))}
        </dl>
        <PopoverDescription>Ha szerinted tévedés történt, a Discordon fellebbezhetsz.</PopoverDescription>
        {/* Mockup only: flips to the clean state. */}
        <button type="button" onClick={() => setBanned(false)} className="self-start text-xs text-primary underline underline-offset-4">
          Mockup: mutasd büntetés nélkül
        </button>
      </PopoverContent>
    </Popover>
  )
}
