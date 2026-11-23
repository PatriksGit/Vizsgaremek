/**
 * Regression test (frontend review 2026-11-23, ui K4): the legal document dialog (ÁSZF, privacy notice) showed the
 * shared DialogContent's corner X (sr-only "Bezárás") next to its own bottom "Bezárás" button, so a screen reader found
 * two buttons with the same name. It keeps only the bottom one (DialogContent showCloseButton={false}).
 */
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { LegalDialog } from '@/features/auth/LegalDialog'
import { stubBrowserApis } from '@/test/fakeBackend'

beforeAll(stubBrowserApis)
afterEach(cleanup)

it('the open legal dialog has exactly one "Bezárás" button, and it closes the dialog', async () => {
  render(<LegalDialog title="ÁSZF">ÁSZF-et</LegalDialog>)

  fireEvent.click(screen.getByRole('button', { name: 'ÁSZF-et' }))
  const dialog = await screen.findByRole('dialog', { name: 'ÁSZF' })

  const close = screen.getAllByRole('button', { name: 'Bezárás' })
  expect(close).toHaveLength(1)
  expect(dialog.contains(close[0])).toBe(true)

  fireEvent.click(close[0])
  await expect.poll(() => screen.queryByRole('dialog')).toBeNull()
})
