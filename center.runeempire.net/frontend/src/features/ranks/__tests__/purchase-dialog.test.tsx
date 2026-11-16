/**
 * The purchase dialog of the rank shop: 30 or 90 days, what it costs and until
 * when, and whether the runes are enough. Buying is not wired yet, so the final
 * button stays off whatever the balance.
 */
import { cleanup, fireEvent, render, screen, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, describe, expect, it, vi } from 'vitest'

import { PurchaseDialog } from '@/features/ranks/PurchaseDialog'
import type { Rank } from '@/features/ranks/api'

const dragon: Rank = {
  group: 'dragon',
  name: 'Dragon',
  details: 'Leírás',
  gifUrl: null,
  prices: [
    { days: 30, runes: 2000 },
    { days: 90, runes: 5200 },
  ],
  seasonEndsAt: null,
}
const NOW = new Date('2026-11-16T12:00:00Z')

function renderDialog(props: Partial<Parameters<typeof PurchaseDialog>[0]> = {}) {
  const onClose = vi.fn()
  render(
    <MemoryRouter>
      <PurchaseDialog rank={dragon} ownedUntil={null} balance={10_000} now={NOW} onClose={onClose} {...props} />
    </MemoryRouter>,
  )
  return { dialog: screen.getByRole('dialog', { name: 'Dragon' }), onClose }
}

/** The value next to a summary label (Hungarian numbers group with a no-break space). */
const summary = (dialog: HTMLElement, label: string) =>
  within(dialog).getByText(label).nextElementSibling?.textContent?.replace(/\s/g, ' ')

afterEach(cleanup)

describe('the rank purchase dialog', () => {
  it('buying: 30 days by default, active from today', () => {
    const { dialog } = renderDialog()

    expect(within(dialog).getByText('Vásárlás')).toBeTruthy()
    expect(within(dialog).getByText('Mennyi időre szeretnéd?')).toBeTruthy()
    expect(within(dialog).getByRole('radio', { name: /30 nap/ }).getAttribute('aria-checked')).toBe('true')
    expect(summary(dialog, 'Fizetendő')).toBe('2000 rúna')
    expect(summary(dialog, 'Aktív eddig')).toBe('2026.12.16.')
    expect(summary(dialog, 'Egyenleged')).toBe('10 000 rúna')
  })

  it('90 days changes the price and the date, and is marked the better deal', () => {
    const { dialog } = renderDialog()
    const ninety = within(dialog).getByRole('radio', { name: /90 nap/ })

    expect(within(ninety).getByText('Kedvezőbb')).toBeTruthy()
    expect(within(ninety).getByText('≈ 58 rúna / nap')).toBeTruthy()
    fireEvent.click(ninety)

    expect(ninety.getAttribute('aria-checked')).toBe('true')
    expect(summary(dialog, 'Fizetendő')).toBe('5200 rúna')
    expect(summary(dialog, 'Aktív eddig')).toBe('2027.02.14.')
  })

  it('extending counts from the current expiry', () => {
    const { dialog } = renderDialog({ ownedUntil: new Date('2026-11-20T12:00:00Z') })

    expect(within(dialog).getByText('Meghosszabbítás')).toBeTruthy()
    expect(summary(dialog, 'Új lejárat')).toBe('2026.12.20.')
  })

  it('with enough runes the final button is there but off: buying starts later', () => {
    const { dialog } = renderDialog()
    const button = within(dialog).getByRole('button', { name: 'A vásárlás hamarosan indul' }) as HTMLButtonElement

    expect(button.disabled).toBe(true)
  })

  it('without enough runes it says so and offers topping up', () => {
    const { dialog } = renderDialog({ balance: 100 })

    expect(within(dialog).getByText('Nincs elég rúnád ehhez a vásárláshoz.')).toBeTruthy()
    expect(within(dialog).getByRole('link', { name: 'Rúna-feltöltés' }).getAttribute('href')).toBe('/runak/vasarlas')
    expect(within(dialog).queryByRole('button', { name: 'A vásárlás hamarosan indul' })).toBeNull()
  })

  it('a balance that could not be read is a dash, and nothing claims the runes are short', () => {
    const { dialog } = renderDialog({ balance: null })

    expect(summary(dialog, 'Egyenleged')).toContain('—')
    expect(within(dialog).queryByText('Nincs elég rúnád ehhez a vásárláshoz.')).toBeNull()
  })

  it('Mégse closes it', () => {
    const { dialog, onClose } = renderDialog()
    fireEvent.click(within(dialog).getByRole('button', { name: 'Mégse' }))

    expect(onClose).toHaveBeenCalled()
  })
})
