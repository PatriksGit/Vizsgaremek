/**
 * Regression test (review 2026-11-17, UI-2). The bug it guards against: the toast region keeps sonner's default English name.
 * App.tsx renders <Toaster position="top-center" /> from components/ui/sonner,
 * which passes no containerAriaLabel, so sonner (2.0.8) names its always
 * present <section> landmark "Notifications alt+T". A screen reader lists it
 * in English on a Hungarian page (index.html lang="hu"), and reads it when a
 * toast (e.g. a failed logout, a resent code) arrives.
 *
 * Happens when: any visitor using a screen reader opens the site.
 */
import { act, cleanup, render, screen } from '@testing-library/react'
import { toast } from 'sonner'
import { afterEach, expect, it } from 'vitest'

import { Toaster } from '@/components/ui/sonner'
import { stubBrowserApis } from '@/test/fakeBackend'

afterEach(cleanup)

function renderAppToaster() {
  stubBrowserApis()
  // As App.tsx renders it.
  render(<Toaster position="top-center" />)
}

it('the toast region has a Hungarian name', async () => {
  renderAppToaster()
  act(() => {
    toast.error('Nem sikerült kijelentkezni.')
  })
  await screen.findByText('Nem sikerült kijelentkezni.')

  const region = document.querySelector('section[aria-label]')
  expect(region?.getAttribute('aria-label')).not.toMatch(/Notifications/)
})

it('the toast itself shows the app text', async () => {
  renderAppToaster()
  act(() => {
    toast.error('Nem sikerült kijelentkezni.')
  })

  // The toast text itself is the app's own Hungarian text.
  expect(await screen.findByText('Nem sikerült kijelentkezni.')).toBeTruthy()
})
