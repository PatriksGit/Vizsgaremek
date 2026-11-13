import { lazy, Suspense, useState } from 'react'

import { skinUrl } from '@/components/app/skin'
import { useIsMobile } from '@/hooks/use-mobile'

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
 * The player's own skin as a 3D figure in the hero: 120x200 on wide screens,
 * 72x128 on phones, faded in once the skin is ready (nothing shows before,
 * so no Steve flashes up). Falls back to the CSS Steve without a name,
 * without WebGL, or when the skin cannot be loaded.
 */
export function SkinFigure({ name }: { name?: string }) {
  const isMobile = useIsMobile()
  const [failedName, setFailedName] = useState<string | null>(null)
  const [width, height] = isMobile ? [72, 128] : [120, 200]

  return (
    <div aria-hidden="true" className="relative h-32 w-18 shrink-0 md:h-50 md:w-30">
      {!name || failedName === name ? (
        <Stand />
      ) : (
        // Empty while three.js downloads: Steve only stands in when the skin cannot be shown.
        <Suspense fallback={null}>
          <SkinViewer3D url={skinUrl(name)} width={width} height={height} onError={() => setFailedName(name)} />
        </Suspense>
      )}
    </div>
  )
}
