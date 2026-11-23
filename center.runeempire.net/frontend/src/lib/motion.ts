import type { CSSProperties } from 'react'

/** Places a .content-in element in the page-load choreography (see index.css). */
export function enterAfter(milliseconds: number): CSSProperties {
  return { '--delay': milliseconds } as CSSProperties
}

/** A list's page-load stagger: one step per item from the moment it replaces its skeletons, capped after six. */
export const staggerDelay = (index: number, stepMs: number) => Math.min(index, 6) * stepMs
