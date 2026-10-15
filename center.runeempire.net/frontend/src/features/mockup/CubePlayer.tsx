import type { CSSProperties } from 'react'

/*
 * THROWAWAY: stands in for the skinview3d render in the home page mockup.
 * A Steve-coloured player built from CSS 3D boxes, so the mockup shows the
 * turning figure without the three.js dependency.
 */

type BoxProps = {
  /** Size in skin pixels: width, height, depth. */
  size: [number, number, number]
  /** Centre of the box relative to the player's feet, in skin pixels. */
  at: [number, number, number]
  color: string
  /** Optional colour of the top face (hair). */
  top?: string
}

const PIXEL = 9

function Box({ size: [w, h, d], at: [x, y, z], color, top }: BoxProps) {
  const face = (width: number, height: number, transform: string, shade: number, fill = color): CSSProperties => ({
    position: 'absolute',
    width: width * PIXEL,
    height: height * PIXEL,
    left: (-width * PIXEL) / 2,
    top: (-height * PIXEL) / 2,
    background: fill,
    filter: `brightness(${shade})`,
    transform,
  })

  return (
    <div
      className="absolute transform-3d"
      style={{ transform: `translate3d(${x * PIXEL}px, ${-y * PIXEL}px, ${z * PIXEL}px)` }}
    >
      <div style={face(w, h, `translateZ(${(d * PIXEL) / 2}px)`, 1)} />
      <div style={face(w, h, `rotateY(180deg) translateZ(${(d * PIXEL) / 2}px)`, 0.7)} />
      <div style={face(d, h, `rotateY(90deg) translateZ(${(w * PIXEL) / 2}px)`, 0.85)} />
      <div style={face(d, h, `rotateY(-90deg) translateZ(${(w * PIXEL) / 2}px)`, 0.85)} />
      <div style={face(w, d, `rotateX(90deg) translateZ(${(h * PIXEL) / 2}px)`, 1.1, top ?? color)} />
      <div style={face(w, d, `rotateX(-90deg) translateZ(${(h * PIXEL) / 2}px)`, 0.6)} />
    </div>
  )
}

export function CubePlayer() {
  return (
    <div className="relative h-0 w-0 transform-3d animate-[spin-y_14s_linear_infinite] motion-reduce:animate-none motion-reduce:transform-[rotateY(-30deg)]">
      <Box size={[4, 12, 4]} at={[-2, 6, 0]} color="#3b3f8f" />
      <Box size={[4, 12, 4]} at={[2, 6, 0]} color="#3b3f8f" />
      <Box size={[8, 12, 4]} at={[0, 18, 0]} color="#0a9a9e" />
      <Box size={[4, 12, 4]} at={[-6, 18, 0]} color="#c08a5c" />
      <Box size={[4, 12, 4]} at={[6, 18, 0]} color="#c08a5c" />
      <Box size={[8, 8, 8]} at={[0, 28, 0]} color="#c08a5c" top="#4a3220" />
    </div>
  )
}
