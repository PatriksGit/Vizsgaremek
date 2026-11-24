/**
 * Review 2026-11-24 UX-1: the JoinCard's Discord link (and ErrorPage's E-mail link) passed their own classes through
 * buttonVariants({ className }), which cva appends without tailwind-merge. The outline variant's hover:bg-muted then
 * stayed beside the caller's hover:bg-discord/15, and the one later in the built stylesheet (the grey) won on hover.
 * jsdom has no cascade, so this checks the class list itself: the caller's class replaces the variant's competing one.
 */
import { cleanup, render, screen } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { ErrorPage } from '@/components/ErrorPage'
import { JoinCard } from '@/features/home/JoinCard'

vi.mock('@/config/site', async (importOriginal) => {
  const { site } = await importOriginal<typeof import('@/config/site')>()
  return { site: { ...site, contactEmail: 'hello@example.com' } }
})

afterEach(cleanup)

const classesOf = (element: HTMLElement) => element.className.split(/\s+/)

describe('button links that override a variant', () => {
  it('the JoinCard Discord link hovers in the Discord tint only, without the outline grey', () => {
    render(<JoinCard />)
    const classes = classesOf(screen.getByRole('link', { name: /Csatlakozás a Discordhoz/ }))

    expect(classes).toContain('hover:bg-discord/15')
    expect(classes).not.toContain('hover:bg-muted')
    expect(classes).toContain('h-11')
    expect(classes).not.toContain('h-9')
  })

  it('the ErrorPage E-mail link keeps only its own height and padding', () => {
    render(<ErrorPage status={503} />)
    const classes = classesOf(screen.getByRole('link', { name: /E-mail/ }))

    expect(classes).toEqual(expect.arrayContaining(['h-11', 'px-5']))
    expect(classes).not.toContain('h-9')
    expect(classes).not.toContain('px-2.5')
  })

  it('control: the variant classes nothing overrides stay (the outline border colour is replaced, the border kept)', () => {
    render(<JoinCard />)
    const classes = classesOf(screen.getByRole('link', { name: /Csatlakozás a Discordhoz/ }))

    expect(classes).toEqual(expect.arrayContaining(['border', 'rounded-lg', 'hover:text-foreground', 'border-discord/40']))
  })
})
