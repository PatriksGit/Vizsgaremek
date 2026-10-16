import { faCartShopping, faUser } from '@fortawesome/free-solid-svg-icons'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { Link } from 'react-router'

import { Panel } from '@/components/app/Panel'
import { buttonVariants } from '@/components/ui/button'
import { Skeleton } from '@/components/ui/skeleton'
import { useAccount } from '@/features/auth/queries'
import { enterAfter } from '@/lib/motion'

import { CubePlayer } from './CubePlayer'

/**
 * The greeting with the player's name, rank and last time online, the way
 * to the shop and the profile, and their figure on the right. The page's warmest card: a faint gold light from the
 * top-left corner on top of the panel's own sheen.
 */
export function HeroCard() {
  const { data: account } = useAccount()

  return (
    <Panel
      as="section"
      aria-label="Üdvözlés"
      className="card-rise flex items-center justify-between gap-6 bg-[radial-gradient(120%_140%_at_0%_0%,color-mix(in_oklab,var(--primary)_13%,transparent),transparent_60%),linear-gradient(to_bottom,rgb(255_255_255/0.03),transparent)] py-5"
    >
      <div className="content-in flex min-w-0 flex-col gap-2" style={enterAfter(400)}>
        <p className="text-sm text-muted-foreground">Üdv újra a birodalomban,</p>
        <h1 className="font-heading text-4xl leading-none wrap-break-word text-foreground sm:text-5xl">{account?.display_name}</h1>
        {/* Rank and last time online arrive with the game server's data. */}
        <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-muted-foreground">
          <Skeleton className="h-5 w-14" />
          <div className="flex items-center gap-2 whitespace-nowrap">
            Utoljára online: <Skeleton className="h-4 w-20" />
          </div>
          <span className="sr-only">A rangod és az utolsó belépésed még nem érhető el.</span>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          <Link to="/bolt" className={buttonVariants({ size: 'lg', className: 'px-4' })}>
            <FontAwesomeIcon icon={faCartShopping} aria-hidden="true" />
            Bolt megnyitása
          </Link>
          <Link to="/beallitasok" className={buttonVariants({ variant: 'outline', size: 'lg', className: 'px-4' })}>
            <FontAwesomeIcon icon={faUser} aria-hidden="true" />
            Profilom
          </Link>
        </div>
      </div>

      {/* 32 skin pixels at 5.25 px: 168 px, about nine tenths of the card, standing on the box's bottom edge. */}
      <div aria-hidden="true" className="relative h-45 w-28 shrink-0 perspective-distant">
        {/* Tipped a little towards the viewer, so the top of the head shows too. */}
        <div className="absolute bottom-1.5 left-1/2 transform-[rotateX(-14deg)] transform-3d">
          <CubePlayer scale={5.25} />
        </div>
      </div>
    </Panel>
  )
}
