import type { CSSProperties } from 'react'

/** Places a .content-in element in the page-load choreography (see index.css). */
export function enterAfter(milliseconds: number): CSSProperties {
  return { '--delay': milliseconds } as CSSProperties
}
