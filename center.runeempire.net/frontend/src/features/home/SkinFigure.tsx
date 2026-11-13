import { lazy, Suspense, useState } from 'react'

import { skinUrl } from '@/components/app/skin'
import { useIsMobile } from '@/hooks/use-mobile'
import { cn } from '@/lib/utils'

import { CubePlayer } from './CubePlayer'

const SkinViewer3D = lazy(() => import('./SkinViewer3D'))

/** The stand-in Steve made of CSS boxes, for when the 3D viewer cannot run or the skin cannot load. */
function Stand() {
  return (
    <div className="relative h-full w-full perspective-distant">
      {/* Tipped a little towards the viewer, so the top of the head shows too. */}
      <div className="absolute bottom-1 left-1/2 origin-bottom transform-[rotateX(-14deg)] transform-3d max-md:scale-[0.58]">
        <CubePlayer scale={6} />
      </div>
    </div>
  )
}

/**
 * The loading placeholder: a player's outline in Minecraft's proportions
 * (head 8, body and arms 12, legs 12 skin pixels; one skin pixel is --u),
 * shimmering like every other skeleton until the 3D figure is ready.
 */
function Silhouette({ className }: { className?: string }) {
  return (
    <div aria-hidden="true" className={cn('flex flex-col items-center [--u:3px] md:[--u:5px]', className)}>
      <div className="skeleton size-[calc(var(--u)*8)] rounded-sm" />
      <div className="mt-0.5 flex gap-0.5">
        <div className="skeleton h-[calc(var(--u)*12)] w-[calc(var(--u)*4)] rounded-sm" />
        <div className="skeleton h-[calc(var(--u)*12)] w-[calc(var(--u)*8)] rounded-sm" />
        <div className="skeleton h-[calc(var(--u)*12)] w-[calc(var(--u)*4)] rounded-sm" />
      </div>
      <div className="mt-0.5 flex gap-0.5">
        <div className="skeleton h-[calc(var(--u)*12)] w-[calc(var(--u)*4)] rounded-sm" />
        <div className="skeleton h-[calc(var(--u)*12)] w-[calc(var(--u)*4)] rounded-sm" />
      </div>
    </div>
  )
}

/**
 * The player's own skin as a 3D figure in the hero: 120x200 on wide screens,
 * 72x128 on phones. A shimmering outline holds its place until the figure
 * with the real skin fades in (no Steve flashes up first). Falls back to the
 * CSS Steve without a name, without WebGL, or when the skin cannot be loaded.
 */
export function SkinFigure({ name }: { name?: string }) {
  const isMobile = useIsMobile()
  const [failedName, setFailedName] = useState<string | null>(null)
  const [readyName, setReadyName] = useState<string | null>(null)
  const [width, height] = isMobile ? [72, 128] : [120, 200]

  if (!name || failedName === name) {
    return (
      <div aria-hidden="true" className="relative h-32 w-18 shrink-0 md:h-50 md:w-30">
        <Stand />
      </div>
    )
  }

  return (
    <div aria-hidden="true" className="relative grid h-32 w-18 shrink-0 place-items-center md:h-50 md:w-30">
      <Silhouette
        className={cn(
          // Under the figure and never in the way of dragging it, even while fading out.
          'pointer-events-none col-start-1 row-start-1 transition-opacity duration-500 motion-reduce:transition-none',
          readyName === name && 'opacity-0',
        )}
      />
      <div className="relative z-10 col-start-1 row-start-1">
        <Suspense fallback={null}>
          <SkinViewer3D
            url={skinUrl(name)}
            width={width}
            height={height}
            onReady={() => setReadyName(name)}
            onError={() => setFailedName(name)}
          />
        </Suspense>
      </div>
    </div>
  )
}
