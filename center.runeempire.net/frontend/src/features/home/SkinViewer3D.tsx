import { useEffect, useEffectEvent, useRef, useState } from 'react'

import { cn } from '@/lib/utils'
import { IdleAnimation, SkinViewer } from 'skinview3d'

type SkinViewer3DProps = {
  url: string
  width: number
  height: number
  /** The viewer could not start (no WebGL) or the skin did not load. */
  onError: () => void
}

/**
 * The player's skin as a 3D figure (skinview3d on three.js), slowly turning
 * round and breathing idly; dragging turns it by hand (it carries on turning
 * when let go). Under reduced motion it stands still, turned a little
 * towards the greeting.
 * Loaded on its own, so three.js only downloads with the overview's hero.
 * Hidden until the skin is on it, then faded in, so no blank or default
 * figure shows first.
 */
export default function SkinViewer3D({ url, width, height, onError }: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The latest callback, without rebuilding the viewer when the parent passes a new one.
  const fail = useEffectEvent(onError)
  // Which skin is on the figure, so a new name hides it again until its skin arrives.
  const [shownUrl, setShownUrl] = useState<string | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return

    let viewer: SkinViewer
    try {
      viewer = new SkinViewer({ canvas, width, height, fov: 40, zoom: 0.9, pixelRatio: 'match-device' })
    } catch {
      fail()
      return
    }

    viewer.controls.enableZoom = false
    viewer.controls.enablePan = false
    viewer.playerWrapper.rotation.y = -0.45
    if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      viewer.animation = new IdleAnimation()
      viewer.autoRotate = true
      viewer.autoRotateSpeed = 0.6
    }

    viewer
      .loadSkin(url, { model: 'auto-detect' })
      .then(() => setShownUrl(url))
      .catch(() => fail())

    // StrictMode mounts twice in development: every viewer frees its WebGL context.
    return () => viewer.dispose()
  }, [url, width, height])

  return (
    <canvas
      ref={canvasRef}
      className={cn(
        // Fades in and rises a little into place once the skin is on it, instead of popping up.
        'cursor-grab transition-[opacity,translate,scale] duration-700 ease-out active:cursor-grabbing motion-reduce:transition-none',
        shownUrl === url ? 'translate-y-0 scale-100 opacity-100' : 'translate-y-3 scale-95 opacity-0',
      )}
    />
  )
}
