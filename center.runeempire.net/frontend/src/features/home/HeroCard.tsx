import { faCartShopping, faGear } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router'

import { Panel } from '@/components/app/Panel'
import { SoonButton } from '@/components/app/SoonButton'
import { buttonVariants } from '@/components/ui/button'
import { features } from '@/config/features'
import { useAccount } from '@/features/auth/queries'
import { enterAfter } from '@/lib/motion'

import { CubePlayer } from './CubePlayer'
import { registeredWithin, registrationDate } from './registration'

/**
 * The greeting with the player's name and registration date, the way to the
 * shop and the settings, and their figure on the right. The page's warmest
 * card: a faint gold light from the top-left corner on top of the panel's own
 * sheen. A player on their first day is welcomed, not welcomed back.
 */
export function HeroCard() {
  const { data: account } = useAccount()
  const greeting = registeredWithin(account, 1) ? 'Üdv a birodalomban,' : 'Üdv újra a birodalomban,'

  return (
    <Panel
      as="section"
      aria-label="Üdvözlés"
      // Phones: name and figure side by side, the buttons on their own row below, so nothing overlaps.
      // From sm up the figure spans both rows and the buttons sit under the name.
      className="card-rise grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-4 gap-y-4 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklab,var(--primary)_13%,transparent),transparent_60%),linear-gradient(to_bottom,rgb(255_255_255/0.03),transparent)] py-5 sm:gap-x-6"
    >
      <div className="content-in flex min-w-0 flex-col gap-2 sm:self-end" style={enterAfter(400)}>
        <p className="text-sm text-muted-foreground">{greeting}</p>
        <h1 className="font-heading text-4xl leading-none wrap-break-word text-foreground sm:text-5xl">{account?.display_name}</h1>
        {account?.registered_at && (
          <p className="text-sm text-muted-foreground">
            Regisztráltál: <span className="text-foreground">{registrationDate.format(new Date(account.registered_at))}</span>
          </p>
        )}
      </div>

      {/* 32 skin pixels at 5.25 px: 168 px, about nine tenths of the card (three quarters of that on phones), standing on the box's bottom edge. */}
      <div aria-hidden="true" className="relative h-32 w-20 shrink-0 perspective-distant sm:row-span-2 sm:h-45 sm:w-28">
        {/* Tipped a little towards the viewer, so the top of the head shows too. */}
        <div className="absolute bottom-1.5 left-1/2 origin-bottom transform-[rotateX(-14deg)] transform-3d max-sm:scale-70">
          <CubePlayer scale={5.25} />
        </div>
      </div>

      <div className="content-in col-span-2 flex flex-wrap gap-2 sm:col-span-1 sm:self-start" style={enterAfter(450)}>
        {features.ranks ? (
          <Link to="/rangok" className={buttonVariants({ size: 'lg', className: 'h-11 px-4' })}>
            <FontAwesomeIcon icon={faCartShopping} aria-hidden="true" />
            Bolt megnyitása
          </Link>
        ) : (
          <SoonButton icon={faCartShopping}>Bolt megnyitása</SoonButton>
        )}
        <Link to="/beallitasok" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'h-11 px-4' })}>
          <FontAwesomeIcon icon={faGear} aria-hidden="true" />
          Fiókbeállítások
        </Link>
      </div>
    </Panel>
  )
}
