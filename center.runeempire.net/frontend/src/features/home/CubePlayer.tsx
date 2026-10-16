import type { CSSProperties } from 'react'

/*
 * Stand-in for the player's own skin until the skin endpoint and the 3D
 * viewer (skinview3d) arrive: a Steve-coloured figure built from CSS 3D boxes.
 */

type BoxProps = {
  /** Size in skin pixels: width, height, depth. */
  size: [number, number, number]
  /** Centre of the box relative to the player's feet, in skin pixels. */
  at: [number, number, number]
  color: string
  /** Optional colour of the top face (hair). */
  top?: string
  /** Screen pixels per skin pixel. */
  scale: number
}

function Box({ size: [w, h, d], at: [x, y, z], color, top, scale }: BoxProps) {
  const face = (width: number, height: number, transform: string, shade: number, fill = color): CSSProperties => ({
    position: 'absolute',
    width: width * scale,
    height: height * scale,
    left: (-width * scale) / 2,
    top: (-height * scale) / 2,
    background: fill,
    filter: `brightness(${shade})`,
    transform,
  })

  return (
    <div
      className="absolute transform-3d"
      style={{ transform: `translate3d(${x * scale}px, ${-y * scale}px, ${z * scale}px)` }}
    >
      <div style={face(w, h, `translateZ(${(d * scale) / 2}px)`, 1)} />
      <div style={face(w, h, `rotateY(180deg) translateZ(${(d * scale) / 2}px)`, 0.7)} />
      <div style={face(d, h, `rotateY(90deg) translateZ(${(w * scale) / 2}px)`, 0.85)} />
      <div style={face(d, h, `rotateY(-90deg) translateZ(${(w * scale) / 2}px)`, 0.85)} />
      <div style={face(w, d, `rotateX(90deg) translateZ(${(h * scale) / 2}px)`, 1.1, top ?? color)} />
      <div style={face(w, d, `rotateX(-90deg) translateZ(${(h * scale) / 2}px)`, 0.6)} />
    </div>
  )
}

type CubePlayerProps = {
  /** Screen pixels per skin pixel; the figure is 32 skin pixels tall. */
  scale: number
}

/** The figure in a three-quarter view, turning a little back and forth; its origin is between its feet. */
export function CubePlayer({ scale }: CubePlayerProps) {
  return (
    <div className="relative h-0 w-0 transform-3d animate-[sway_5s_ease-in-out_infinite_alternate] motion-reduce:animate-none motion-reduce:transform-[rotateY(-25deg)]">
      <Box scale={scale} size={[4, 12, 4]} at={[-2, 6, 0]} color="#3b3f8f" />
      <Box scale={scale} size={[4, 12, 4]} at={[2, 6, 0]} color="#3b3f8f" />
      <Box scale={scale} size={[8, 12, 4]} at={[0, 18, 0]} color="#0a9a9e" />
      <Box scale={scale} size={[4, 12, 4]} at={[-6, 18, 0]} color="#c08a5c" />
      <Box scale={scale} size={[4, 12, 4]} at={[6, 18, 0]} color="#c08a5c" />
      <Box scale={scale} size={[8, 8, 8]} at={[0, 28, 0]} color="#c08a5c" top="#4a3220" />
    </div>
  )
}
