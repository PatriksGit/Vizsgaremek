/**
 * Buying a rank is one plain confirmation (owner, 2026-11-17): what is bought,
 * for how long and for how much, until when it lasts, and that it cannot be
 * undone. Buying is not wired yet, so the confirm button stays off.
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
  color: null,
  servers: [],
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

describe('the rank purchase confirmation', () => {
  it('names what is bought, until when, and that it cannot be undone', () => {
    const { dialog } = renderDialog()

    expect(within(dialog).getByRole('heading', { name: 'Biztosan megveszed?' })).toBeTruthy()
    expect(within(dialog).getByText('Dragon · 30 nap · 2000 rúna')).toBeTruthy()
    expect(text(within(dialog).getByText(/Aktív eddig/))).toBe('Aktív eddig: 2026.12.16.')
    expect(within(dialog).getByText('A vásárlás nem visszavonható.')).toBeTruthy()
  })

  it('the duration and price are the ones whose button was pressed', () => {
    const { dialog } = renderDialog({ days: 90 })

    expect(within(dialog).getByText('Dragon · 90 nap · 5200 rúna')).toBeTruthy()
    expect(text(within(dialog).getByText(/Aktív eddig/))).toBe('Aktív eddig: 2027.02.14.')
  })

  it('extending counts from the current expiry', () => {
    const { dialog } = renderDialog({ ownedUntil: new Date('2026-11-20T12:00:00Z') })

    expect(within(dialog).getByRole('heading', { name: 'Biztosan meghosszabbítod?' })).toBeTruthy()
    expect(text(within(dialog).getByText(/Új lejárat/))).toBe('Új lejárat: 2026.12.20.')
    expect(within(dialog).getByRole('button', { name: 'Meghosszabbítás' })).toBeTruthy()
  })

  /** The action's own name on the main button, Mégse first (owner, 2026-11-17: Mégse red, the purchase green). */
  it('Mégse comes first, then the purchase button, which is there but off: buying starts later', () => {
    const { dialog } = renderDialog()
    const confirm = within(dialog).getByRole('button', { name: 'Megvásárlás' }) as HTMLButtonElement
    const cancel = within(dialog).getByRole('button', { name: 'Mégse' })

    expect(confirm.disabled).toBe(true)
    expect(cancel.compareDocumentPosition(confirm) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(within(dialog).getByText('A vásárlás hamarosan indul.')).toBeTruthy()
  })

  it('without enough runes it says how many are missing and offers topping up', () => {
    const { dialog } = renderDialog({ balance: 1500 })

    expect(text(within(dialog).getByText(/Nincs elég rúnád/))).toBe('Nincs elég rúnád, még 500 hiányzik.')
    expect(within(dialog).getByRole('link', { name: 'Rúna-feltöltés' }).getAttribute('href')).toBe('/runak/vasarlas')
    expect(within(dialog).queryByRole('button', { name: 'Megvásárlás' })).toBeNull()
  })

  it('a balance that could not be read does not claim the runes are short', () => {
    const { dialog } = renderDialog({ balance: null })

    expect(within(dialog).queryByText(/Nincs elég rúnád/)).toBeNull()
    expect(within(dialog).getByRole('button', { name: 'Megvásárlás' })).toBeTruthy()
  })

  it('once the season is over it can no longer be bought, even with the dialog open', () => {
    const { dialog } = renderDialog({ rank: { ...dragon, seasonEndsAt: '2026-11-16T11:00:00Z' } })

    expect(within(dialog).getByText('Már nem vásárolható')).toBeTruthy()
    expect(within(dialog).queryByRole('button', { name: 'Megvásárlás' })).toBeNull()
  })

  /**
   * A shadcn AlertDialog (owner, 2026-11-17): a decision, not a page to read,
   * so it has no X; only Mégse (or Esc) leaves it, a stray tap beside it does not.
   */
  it('is an alert dialog without an X', () => {
    const { dialog } = renderDialog()

    expect(within(dialog).queryByRole('button', { name: 'Bezárás' })).toBeNull()
  })

  it('Mégse closes it', () => {
    const { dialog, onClose } = renderDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mégse' }))

    expect(onClose).toHaveBeenCalled()
  })
})
