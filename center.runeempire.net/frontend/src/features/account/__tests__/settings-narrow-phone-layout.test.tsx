/**
 * Regression test (review 2026-11-24 VI-7, VI-9, VI-10, AC-3). The bugs it guards against on the Beállítások page at
 * 320-360 px (measured with Playwright): "Google-" / "fiókkal" broke apart at the hyphen (VI-7); the player's own e-mail
 * and a 16-letter name were cut with "…" (VI-9); the Management row's "Megnyitás" was a 90 px rounded-lg button while the
 * other rows' actions fill the width (VI-10); below 354 px every row's title fell under its icon (AC-3: the icon sat in the
 * same wrapping row). jsdom has no layout, so this pins the structure; the browser guards are VI-settings.js, AC-3 and AC-6.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

const ACCOUNT = {
  uuid: 'u-1',
  username: 'xx_dragonslayer_',
  display_name: 'xX_DragonSlayer_',
  email: 'kovacs.bence.2011@gmail.com',
  registered_at: '2026-01-01T00:00:00Z',
  two_factor_enabled: false,
  can_manage: true,
}

beforeAll(stubBrowserApis)
afterEach(cleanup)

function renderPage() {
  installFakeBackend({ 'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }) })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  client.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
}

describe('Beállítások on a narrow phone', () => {
  it('never breaks "Google-fiókkal" at its hyphen', () => {
    renderPage()

    expect(screen.getByText('Google-fiókkal').className).toContain('whitespace-nowrap')
  })

  it('shows the whole e-mail and name: the address wraps, the name shrinks to one line', () => {
    renderPage()
    const email = screen.getByText(ACCOUNT.email)
    const name = screen.getByText(ACCOUNT.display_name)

    expect(email.className).toContain('wrap-anywhere')
    expect(email.className).not.toContain('truncate')
    expect(name.closest('p')?.className).not.toContain('truncate')
    expect(name.closest('span.w-max')).not.toBeNull()
  })

  it('gives "Megnyitás" the other rows\' full-width pill shape', () => {
    renderPage()
    const open = screen.getByRole('link', { name: 'Megnyitás' })

    expect(open.className).toContain('max-sm:w-full')
    expect(open.className).toContain('rounded-full')
  })

  it('keeps every row\'s icon out of the wrapping part, so the title never falls under it', () => {
    renderPage()

    for (const id of ['password-title', 'two-factor-title', 'management-title']) {
      const title = document.getElementById(id)!
      const icon = title.closest('section')!.querySelector('[aria-hidden="true"]')!
      expect(icon.parentElement?.className).not.toContain('flex-wrap')
    }
  })
})
