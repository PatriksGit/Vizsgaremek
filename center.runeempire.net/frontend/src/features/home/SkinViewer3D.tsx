import { useEffect, useEffectEvent, useRef } from 'react'
import { IdleAnimation, SkinViewer } from 'skinview3d'

type SkinViewer3DProps = {
  url: string
  width: number
  height: number
  /** The viewer could not start (no WebGL) or the skin did not load. */
  onError: () => void
}

/**
 * The player's skin as a 3D figure (skinview3d on three.js), turned a little
 * towards the greeting and breathing idly; it can be turned by dragging.
 * Loaded on its own, so three.js only downloads with the overview's hero.
 */
export default function SkinViewer3D({ url, width, height, onError }: SkinViewer3DProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  // The latest callback, without rebuilding the viewer when the parent passes a new one.
  const fail = useEffectEvent(onError)

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
    }

    viewer.loadSkin(url, { model: 'auto-detect' }).catch(() => fail())

    // StrictMode mounts twice in development: every viewer frees its WebGL context.
    return () => viewer.dispose()
  }, [url, width, height])

  return <canvas ref={canvasRef} className="cursor-grab active:cursor-grabbing" />
}
