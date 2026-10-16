import { cn } from '@/lib/utils'

/*
 * Stand-in for the front of the player's own head until the skin endpoint
 * arrives: Steve's 8×8 face, in the same colours as the hero's CubePlayer.
 */
const FACE = ['HHHHHHHH', 'HHHHHHHH', 'HSSSSSSH', 'SSSSSSSS', 'SWESSEWS', 'SSSNNSSS', 'SSMSSMSS', 'SSMMMMSS']

const COLOR: Record<string, string> = {
  H: '#4a3220',
  S: '#c08a5c',
  W: '#ffffff',
  E: '#4b3a8a',
  N: '#9a6440',
  M: '#6b3f28',
}

export function PlayerHead({ className }: { className?: string }) {
  return (
    <svg viewBox="0 0 8 8" shapeRendering="crispEdges" aria-hidden="true" className={cn('rounded-md', className)}>
      {FACE.flatMap((row, y) =>
        [...row].map((pixel, x) => <rect key={`${x}-${y}`} x={x} y={y} width={1} height={1} fill={COLOR[pixel]} />),
      )}
    </svg>
  )
}
