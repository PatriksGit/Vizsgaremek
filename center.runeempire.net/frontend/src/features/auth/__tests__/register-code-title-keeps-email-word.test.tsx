/**
 * Regression test (review 2026-11-24 VI-7, second path). The bug it guards against: at 320 px the registration code step's
 * title broke as "Nézd meg az e-" / "mailed" (Playwright). The global text-wrap: pretty fixes it only in Chromium (Firefox
 * ignores it) and a no-break hyphen (U+2011) is not in Fraunces, so "e-mailed" is a nowrap span. The browser guard is
 * VI-auth.js.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it } from 'vitest'

import { RegisterCodeStep } from '@/features/auth/RegisterCodeStep'
import { stubBrowserApis } from '@/test/fakeBackend'

beforeAll(stubBrowserApis)
afterEach(cleanup)

it('never breaks "e-mailed" at its hyphen in the code step title', () => {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>
        <RegisterCodeStep
          pending={{ email: 'kovacs.bence.2011@gmail.com', expiresInMinutes: 15 }}
          onBack={() => {}}
          onResend={async () => true}
        />
      </MemoryRouter>
    </QueryClientProvider>,
  )

  expect(screen.getByRole('heading', { name: 'Nézd meg az e-mailed' })).toBeTruthy()
  expect(screen.getByText('e-mailed').className).toContain('whitespace-nowrap')
})
