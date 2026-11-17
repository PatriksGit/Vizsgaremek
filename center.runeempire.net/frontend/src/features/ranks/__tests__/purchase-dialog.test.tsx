/**
 * Pressing a duration button opens a proper popup (owner, 2026-11-17): it
 * checks the runes first. Too few -> an X in a circle and "Nincs elég rúnád a
 * rang megvásárlásához."; enough -> a ? in a circle, "Biztosan szeretnéd
 * megvásárolni a rangot?", the price and the expiry, then Igen / Mégse.
 * Buying is not wired yet, so Igen stays off.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import type { Rank } from '@/features/ranks/api'
import { PurchaseDialog } from '@/features/ranks/PurchaseDialog'

const dragon: Rank = {
  group: 'dragon',
  name: 'Dragon',
  details: 'Leírás',
  gifUrl: null,
  prefixUrl: null,
  prices: [
    { days: 30, runes: 2000 },
    { days: 90, runes: 5200 },
  ],
  seasonEndsAt: null,
  color: null
}
const NOW = new Date('2026-11-16T12:00:00Z')

function renderDialog(props: Partial<Parameters<typeof PurchaseDialog>[0]> = {}) {
  const onClose = vi.fn()
  render(
    <MemoryRouter>
      <PurchaseDialog rank={dragon} days={30} ownedUntil={null} balance={10_000} now={NOW} onClose={onClose} {...props} />
    </MemoryRouter>,
  )
  return { dialog: screen.getByRole('alertdialog'), onClose }
}

/** Hungarian numbers group with a no-break space. */
const text = (element: HTMLElement) => element.textContent?.replace(/\s/g, ' ')

afterEach(cleanup)

describe('with enough runes: are you sure?', () => {
  it('asks, then names the rank, the price and the expiry, and that it cannot be undone', () => {
    const { dialog } = renderDialog()

    expect(within(dialog).getByRole('heading', { name: 'Biztosan szeretnéd megvásárolni a rangot?' })).toBeTruthy()
    expect(dialog.querySelector('[data-icon="question"]')).toBeTruthy()
    expect(within(dialog).getByText('Dragon · 30 nap')).toBeTruthy()
    expect(text(within(dialog).getByText(/^2000/))).toBe('2000 rúna')
    expect(text(within(dialog).getByText(/Lejárat/))).toBe('Lejárat: 2026.12.16.')
    expect(within(dialog).getByText('A vásárlás nem visszavonható.')).toBeTruthy()
  })

  it('the duration and price are the ones whose button was pressed', () => {
    const { dialog } = renderDialog({ days: 90 })

    expect(within(dialog).getByText('Dragon · 90 nap')).toBeTruthy()
    expect(text(within(dialog).getByText(/^5200/))).toBe('5200 rúna')
    expect(text(within(dialog).getByText(/Lejárat/))).toBe('Lejárat: 2027.02.14.')
  })

  it('extending asks about extending and counts from the current expiry', () => {
    const { dialog } = renderDialog({ ownedUntil: new Date('2026-11-20T12:00:00Z') })

    expect(within(dialog).getByRole('heading', { name: 'Biztosan szeretnéd meghosszabbítani a rangot?' })).toBeTruthy()
    expect(text(within(dialog).getByText(/Új lejárat/))).toBe('Új lejárat: 2026.12.20.')
  })

  /** "Igen v Mégse" (owner, 2026-11-17): Igen first. */
  it('Igen comes first and is off for now, saying why; Mégse closes it', () => {
    const { dialog, onClose } = renderDialog()
    const yes = within(dialog).getByRole('button', { name: 'Igen' }) as HTMLButtonElement
    const cancel = within(dialog).getByRole('button', { name: 'Mégse' })

    expect(yes.disabled).toBe(true)
    expect(yes.compareDocumentPosition(cancel) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(document.getElementById(yes.getAttribute('aria-describedby') ?? '')?.textContent).toBe('A vásárlás hamarosan indul.')

    fireEvent.click(cancel)
    expect(onClose).toHaveBeenCalled()
  })

  it('a balance that could not be read does not claim the runes are short', () => {
    const { dialog } = renderDialog({ balance: null })

    expect(within(dialog).getByRole('heading', { name: 'Biztosan szeretnéd megvásárolni a rangot?' })).toBeTruthy()
  })
})

describe('with too few runes', () => {
  it('says so under an X, and how many are missing', () => {
    const { dialog } = renderDialog({ balance: 1500 })

    expect(within(dialog).getByRole('heading', { name: 'Nincs elég rúnád a rang megvásárlásához.' })).toBeTruthy()
    expect(dialog.querySelector('[data-icon="xmark"]')).toBeTruthy()
    expect(text(within(dialog).getByText(/hiányzik/))).toBe('Még 500 rúna hiányzik.')
    expect(within(dialog).queryByRole('button', { name: 'Igen' })).toBeNull()
    expect(within(dialog).queryByText('A vásárlás nem visszavonható.')).toBeNull()
  })

  it('offers topping up, or closing', () => {
    const { dialog, onClose } = renderDialog({ balance: 1500 })

    expect(within(dialog).getByRole('link', { name: 'Rúna-feltöltés' }).getAttribute('href')).toBe('/runak/vasarlas')
    fireEvent.click(within(dialog).getByRole('button', { name: 'Bezárás' }))
    expect(onClose).toHaveBeenCalled()
  })

  it('extending says extending', () => {
    const { dialog } = renderDialog({ balance: 1500, ownedUntil: new Date('2026-11-20T12:00:00Z') })

    expect(within(dialog).getByRole('heading', { name: 'Nincs elég rúnád a rang meghosszabbításához.' })).toBeTruthy()
  })
})

describe('a season that ended while it was open', () => {
  it('can no longer be bought', () => {
    const { dialog } = renderDialog({ rank: { ...dragon, seasonEndsAt: '2026-11-16T11:00:00Z' } })

    expect(within(dialog).getByRole('heading', { name: 'Ez a rang már nem vásárolható.' })).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Igen' })).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Bezárás' })).toBeTruthy()
  })
})
