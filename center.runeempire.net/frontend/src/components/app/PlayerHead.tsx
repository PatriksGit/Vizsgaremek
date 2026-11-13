import { useState } from 'react'

import { cn } from '@/lib/utils'

import { skinUrl } from './skin'

/** Steve's 8x8 face: shown without a name, and when the skin cannot be loaded. */
const FACE = ['HHHHHHHH', 'HHHHHHHH', 'HSSSSSSH', 'SSSSSSSS', 'SWESSEWS', 'SSSNNSSS', 'SSMSSMSS', 'SSMMMMSS']

const COLOR: Record<string, string> = {
  H: '#4a3220',
  S: '#c08a5c',
  W: '#ffffff',
  E: '#4b3a8a',
  N: '#9a6440',
  M: '#6b3f28',
}

/** One layer of the head cut out of the skin: the image eight times the box, shifted so the 8x8 square sits in it. */
const layer = 'pointer-events-none absolute top-[-100%] w-[800%] max-w-none select-none [image-rendering:pixelated]'

/**
 * The front of a player's head, cut out of their skin: the face (skin pixels
 * 8-15) with the hat layer (40-47) on top, crisp at any size. Works for the
 * old 64x32 skins too, since the face sits at the same place there.
 */
export function PlayerHead({ name, className }: { name?: string; className?: string }) {
  const url = name ? skinUrl(name) : null
  // Remembers which skin failed, so another name gets its own try.
  const [failedUrl, setFailedUrl] = useState<string | null>(null)

  if (url === null || failedUrl === url) {
    return (
      <svg viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true" className={cn('rounded-md', className)}>
        {FACE.flatMap((row, y) =>
          [...row].map((pixel, x) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={COLOR[pixel]} />),
        )}
      </svg>
    )
  }

  return (
    <span aria-hidden="true" className={cn('relative inline-block shrink-0 overflow-hidden rounded-md bg-raised', className)}>
      <img src={url} alt="" draggable={false} onError={() => setFailedUrl(url)} className={cn(layer, 'left-[-100%]')} />
      <img src={url} alt="" draggable={false} className={cn(layer, 'left-[-500%]')} />
    </span>
  )
}
