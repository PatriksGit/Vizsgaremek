/**
 * Review 2026-11-24 AC-5: a slow 2FA switch-on of account A answered after A logged out and B logged in in the same tab.
 * The setup dialog wrote "on" into whatever account was cached (useSetTwoFactorEnabled had no uuid
 * check, and setAccount cancels queries, not mutations): B's Beállítások said "Bekapcsolva" while B's
 * 2FA is off, until the next /auth/me.
 */
import { act, cleanup, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { afterEach, beforeAll, expect, it, vi } from 'vitest'

import { stubBrowserApis, type Reply } from '@/test/fakeBackend'

vi.mock('@/features/app/AppLayout', async () => {
  const { Outlet } = await import('react-router')
  return { AppLayout: () => <Outlet /> }
})
vi.mock('@/features/home/HomePage', async () => {
  const { Link } = await import('react-router')
  return { HomePage: () => <Link to="/beallitasok">Beállítások</Link> }
})
vi.mock('qrcode', () => ({ default: { toDataURL: vi.fn(async (url: string) => `data:image/png;base64,${btoa(url)}`) } }))

const SECRET = 'JBSWY3DPEHPK3PXPJBSWY3DPEHPK3PXP'
const base = { email: 'x@example.com', can_manage: false, registered_at: '2026-01-01T00:00:00Z' }
const A = { ...base, uuid: 'u-a', username: 'steve_01', display_name: 'Steve_01', two_factor_enabled: false }
const B = { ...base, uuid: 'u-b', username: 'alex_02', display_name: 'Alex_02', two_factor_enabled: false }

beforeAll(stubBrowserApis)
afterEach(cleanup)

async function start() {
  // App holds the query client, the router and the axios client as module singletons: a fresh copy per test.
  vi.resetModules()
  const { installFakeBackend } = await import('@/test/fakeBackend')
  let release: (reply: Reply) => void = () => {}
  installFakeBackend({
    'GET /auth/me': () => ({ status: 200, data: { data: A } }),
    'POST /auth/two-factor/setup': () => ({ status: 200, data: { data: { secret: SECRET, otpauth_url: `otpauth://totp/x?secret=${SECRET}` } } }),
    // A's code check is slow: the server answers when the test says.
    'POST /auth/two-factor/enable': () => new Promise<Reply>((resolve) => (release = resolve)),
    'POST /auth/logout': () => ({ status: 204 }),
    'POST /auth/login': () => ({ status: 200, data: { data: B } }),
  })
  window.history.pushState({}, '', '/beallitasok')
  const { default: App } = await import('@/App')
  render(<App />)
  await screen.findByRole('region', { name: 'Kétlépcsős azonosítás', hidden: true })
  return { answerEnable: () => act(async () => release({ status: 204 })) }
}

const card = () => within(screen.getByRole('region', { name: 'Kétlépcsős azonosítás', hidden: true }))

async function aSendsACodeThenCloses() {
  fireEvent.click(await card().findByRole('button', { name: 'Bekapcsolás' }))
  const dialog = await screen.findByRole('dialog', { name: 'Kétlépcsős azonosítás bekapcsolása' })
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  await within(dialog).findByText('JBSW Y3DP EHPK 3PXP JBSW Y3DP EHPK 3PXP')
  fireEvent.click(within(dialog).getByRole('button', { name: 'Tovább' }))
  fireEvent.change(within(dialog).getByLabelText('Kód az alkalmazásból'), { target: { value: '123456' } })
  await within(dialog).findByRole('button', { name: 'Bekapcsolás…' })
  fireEvent.keyDown(dialog, { key: 'Escape' })
  await waitFor(() => expect(screen.queryByRole('dialog')).toBeNull())
}

async function switchToB() {
  fireEvent.click(screen.getByRole('button', { name: 'Kijelentkezés' }))
  const loginForm = (await screen.findAllByRole('button', { name: 'Belépés' }))[0].closest('form')!
  fireEvent.change(within(loginForm).getByLabelText('Játékosnév'), { target: { value: 'Alex_02' } })
  fireEvent.change(within(loginForm).getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.click(within(loginForm).getByRole('button', { name: 'Belépés' }))
  fireEvent.click(await screen.findByRole('link', { name: 'Beállítások' }))
  await screen.findByText('Alex_02')
}

const settle = () => act(() => new Promise((resolve) => setTimeout(resolve, 200)))

it('A\'s late switch-on does not mark B\'s 2FA as on', { timeout: 15_000 }, async () => {
  const { answerEnable } = await start()
  await aSendsACodeThenCloses()
  await switchToB()
  await answerEnable()
  await settle()

  expect(card().queryByText('Kikapcsolva')).not.toBeNull()
})

it('control: A\'s switch-on answered before the switch leaves B\'s own state', { timeout: 15_000 }, async () => {
  const { answerEnable } = await start()
  await aSendsACodeThenCloses()
  await answerEnable()
  await settle()
  await switchToB()

  expect(card().queryByText('Kikapcsolva')).not.toBeNull()
})
