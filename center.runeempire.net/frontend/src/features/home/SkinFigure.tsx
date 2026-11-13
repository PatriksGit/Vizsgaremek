import { type ComponentProps, type ComponentType, lazy, Suspense, useEffect, useState } from 'react'

import { skinUrl } from '@/components/app/skin'
import { useIsMobile } from '@/hooks/use-mobile'

import { CubePlayer } from './CubePlayer'
import type SkinViewer3DView from './SkinViewer3D'

/** The viewer's code could not be downloaded: report it like a viewer that cannot start, so the CSS Steve stands in. */
function ViewerUnavailable({ onError }: { onError: () => void }) {
  useEffect(onError, [onError])
  return null
}

// A failed download (a dropped request, or a deploy that replaced the chunk) must not take the whole page down.
const SkinViewer3D = lazy<ComponentType<ComponentProps<typeof SkinViewer3DView>>>(() =>
  import('./SkinViewer3D').catch(() => ({ default: ViewerUnavailable })),
)

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
 * The player's own skin as a 3D figure in the hero: 150x250 on wide screens,
 * 84x150 on phones. Its place stays empty until the figure with the real skin
 * fades in (owner, 2026-11-13: no skeleton for the skin; even a cached skin
 * needs three.js and WebGL to start, so an outline would always flash up).
 * Falls back to the CSS Steve without a name, without WebGL, or when the skin
 * cannot be loaded.
 */
export function SkinFigure({ name }: { name?: string }) {
  const isMobile = useIsMobile()
  const [failedName, setFailedName] = useState<string | null>(null)
  const [width, height] = isMobile ? [84, 150] : [150, 250]

  if (!name || failedName === name) {
    return (
      <div aria-hidden="true" className="relative h-37.5 w-21 shrink-0 md:h-62.5 md:w-37.5">
        <Stand />
      </div>
    )
  }

  return (
    <div aria-hidden="true" className="relative grid h-37.5 w-21 shrink-0 place-items-center md:h-62.5 md:w-37.5">
      <Suspense fallback={null}>
        <SkinViewer3D url={skinUrl(name)} width={width} height={height} onError={() => setFailedName(name)} />
      </Suspense>
    </div>
  )
}
