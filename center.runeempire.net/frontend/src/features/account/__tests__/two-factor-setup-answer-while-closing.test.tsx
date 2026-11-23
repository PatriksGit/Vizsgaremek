/**
 * Regression test (frontend review 2026-11-23, AM-N1 from the Phase-1 review).
 * The setup dialog's late-answer guard counted a close only once the ~200 ms exit animation had
 * ended (onOpenChangeComplete). An auth.two_factor_expired answer landing in that window still
 * belonged to the opening: the closing dialog asked a new secret (a second POST /two-factor/setup
 * with nobody looking). The close now counts the moment `open` goes false (useCodeForm's active).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { AccountPage } from '@/features/account/AccountPage'
import { installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async (url: string) => `data:image/png;base64,${btoa(url)}`) } }))

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
const OTPAUTH = `otpauth://totp/RuneEmpire:Steve_01?secret=${SECRET}&issuer=RuneEmpire`
const EXPIRED = 'A bekapcsolás lejárt, kezdd újra.'
const ACCOUNT = {
  uuid: 'u-1',
  username: 'steve_01',
  display_name: 'Steve_01',
  email: 'steve@example.com',
  two_factor_enabled: false,
  can_manage: false,
  registered_at: '2026-01-01T00:00:00Z',
}

beforeAll(stubBrowserApis)
afterEach(() => {
  // A repro that failed before endAnimation() must not hold every animation of the next test.
  delete (HTMLElement.prototype as { getAnimations?: unknown }).getAnimations
  cleanup()
  vi.clearAllMocks()
})

function renderPage() {
  let release: ((reply: Reply) => void) | null = null
  const calls = installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: ACCOUNT } }),
    'POST /auth/two-factor/setup': () => ({ status: 200, data: { data: { secret: SECRET, otpauth_url: OTPAUTH } } }),
    'POST /auth/two-factor/enable': () => new Promise<Reply>((resolve) => (release = resolve)),
  })
  const client = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } })
  client.setQueryData(['account'], ACCOUNT)
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <AccountPage />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  return {
    calls,
    /** The enable request is on its way. */
    enableSent: () => waitFor(() => expect(release).not.toBeNull()),
    /** Answers it at once, in the same tick (no waiting in between). */
    answerEnableNow: (reply: Reply) => release?.(reply),
  }
}

const card = () => within(screen.getByRole('region', { name: 'Kétlépcsős azonosítás' }))
const setupCalls = (calls: string[]) => calls.filter((call) => call === 'POST /auth/two-factor/setup').length

async function openSetupAndTypeCode() {
  fireEvent.click(card().getByRole('button', { name: 'Bekapcsolás' }))
  const dialog = await screen.findByRole('dialog', { name: 'Kétlépcsős azonosítás bekapcsolása' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  await within(dialog).findByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  fireEvent.change(within(dialog).getByLabelText('Kód az alkalmazásból'), { target: { value: '123456' } })
  await within(dialog).findByRole('button', { name: 'Bekapcsolás…' })
  return dialog
}

/**
 * jsdom has no animations, so Base UI ends a close at once. A browser waits for the ~200 ms exit
 * animation: this holds it (an unfinished animation on every element) until the returned call.
 */
function holdExitAnimation() {
  let finish = () => {}
  const finished = new Promise<void>((resolve) => (finish = resolve))
  const timing = { duration: 200, iterations: 1 }
  const animation = { finished, pending: false, playState: 'running', effect: { getTiming: () => timing } }
  Object.defineProperty(HTMLElement.prototype, 'getAnimations', { configurable: true, value: () => [animation] })
  return () => {
    delete (HTMLElement.prototype as { getAnimations?: unknown }).getAnimations
    finish()
  }
}

it('repro: an "expired" answer right after Esc, while the dialog still closes, asks no new secret', async () => {
  const { calls, enableSent, answerEnableNow } = renderPage()
  const dialog = await openSetupAndTypeCode()
  await enableSent()

  const endAnimation = holdExitAnimation()
  fireEvent.keyDown(dialog, { key: 'Escape' })
  answerEnableNow({ status: 422, data: { message: EXPIRED, code: 'auth.two_factor_expired' } })
  await new Promise((resolve) => setTimeout(resolve, 100))
  // Still on its way out: the exit animation has not ended.
  expect(screen.queryByRole('dialog', { hidden: true })).not.toBeNull()
  expect(setupCalls(calls)).toBe(1)

  endAnimation()
  await waitFor(() => expect(screen.queryByRole('dialog', { hidden: true })).toBeNull())
  expect(setupCalls(calls)).toBe(1)
})

it('control: the same answer with the dialog open asks a new secret', async () => {
  const { calls, enableSent, answerEnableNow } = renderPage()
  const dialog = await openSetupAndTypeCode()
  await enableSent()

  answerEnableNow({ status: 422, data: { message: EXPIRED, code: 'auth.two_factor_expired' } })

  expect(await within(dialog).findByText(`${EXPIRED} Olvasd be az új QR-kódot.`)).toBeTruthy()
  await waitFor(() => expect(setupCalls(calls)).toBe(2))
})
