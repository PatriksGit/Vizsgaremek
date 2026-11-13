import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AxiosError } from 'axios'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { LoginForm } from '@/features/auth/LoginForm'
import { http } from '@/lib/api'

import { answer, installFakeBackend, stubBrowserApis, type Reply } from '@/test/fakeBackend'

/** Evidence, expected green: what the login form tells the player for each kind of failure. */
function renderLogin() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/login']}>
        <LoginForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.click(screen.getByRole('button', { name: 'Belépés' }))
}

const alertText = async () => (await screen.findByRole('alert')).textContent

describe('login failures as the player reads them', () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  const cases: [string, Reply, string][] = [
    ['422 wrong credentials', { status: 422, data: { message: 'Hibás játékosnév vagy jelszó.', errors: { username: ['Hibás játékosnév vagy jelszó.'] } } }, 'Hibás játékosnév vagy jelszó.'],
    ['429 throttled', { status: 429, data: { message: 'Túl sok próbálkozás, várj 60 másodpercet.' } }, 'Túl sok próbálkozás, várj 60 másodpercet.'],
    ['403 no session', { status: 403, data: { message: 'A bejelentkezés csak a weboldalról lehetséges.' } }, 'A bejelentkezés csak a weboldalról lehetséges.'],
    ['500 debug exception text', { status: 500, data: { message: 'SQLSTATE[HY000] [2002] Connection refused' } }, 'Váratlan hiba történt, próbáld újra később.'],
    ['503 with a backend message', { status: 503, data: { message: 'A szolgáltatás most nem érhető el.' } }, 'A szolgáltatás most nem érhető el.'],
    ['502 proxy HTML page', { status: 502, data: '<html>Bad gateway</html>' }, 'A szerver most nem érhető el, próbáld újra később.'],
    ['504 proxy empty body', { status: 504, data: '' }, 'A szerver most nem érhető el, próbáld újra később.'],
    ['530 Cloudflare origin down', { status: 530, data: '<html>1033</html>' }, 'A szerver most nem érhető el, próbáld újra később.'],
    ['401 (cannot happen on login)', { status: 401, data: { message: 'Ehhez be kell jelentkezned.' } }, 'Váratlan hiba történt, próbáld újra később.'],
  ]

  it.each(cases)('%s', async (_name, reply, shown) => {
    installFakeBackend({ 'POST /auth/login': () => reply })
    renderLogin()
    expect(await alertText()).toBe(shown)
  })

  it('419 twice: the session-expired text after one retry', async () => {
    const calls = installFakeBackend({ 'POST /auth/login': () => ({ status: 419, data: { message: 'CSRF token mismatch.' } }) })
    renderLogin()
    expect(await alertText()).toBe('A munkamenet lejárt. Frissítsd az oldalt, és ellenőrizd, hogy a sütik engedélyezve vannak.')
    expect(calls.filter((call) => call === 'POST /auth/login')).toHaveLength(2)
    expect(calls.filter((call) => call === 'GET /sanctum/csrf-cookie').length).toBeGreaterThanOrEqual(1)
  })

  it('419 once: a fresh CSRF cookie and the same login again succeeds, with the same body', async () => {
    let attempts = 0
    const bodies: unknown[] = []
    installFakeBackend({
      'POST /auth/login': (config) => {
        bodies.push(config.data)
        return attempts++ === 0
          ? { status: 419, data: { message: 'CSRF token mismatch.' } }
          : { status: 200, data: { data: { uuid: 'u', username: 'steve_01', display_name: 'Steve_01', registered_at: null } } }
      },
    })
    renderLogin()
    await screen.findByRole('button', { name: 'Belépés' })
    await new Promise((resolve) => setTimeout(resolve, 200))
    expect(screen.queryByRole('alert')).toBeNull()
    expect(bodies).toHaveLength(2)
    expect(bodies[1]).toBe(bodies[0])
  })

  it('no answer at all (network down)', async () => {
    installFakeBackend({})
    http.defaults.adapter = (config) =>
      config.url === '/sanctum/csrf-cookie'
        ? answer(config, { status: 204 })
        : Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {}))
    renderLogin()
    expect(await alertText()).toBe('Nem sikerült elérni a szervert. Ellenőrizd az internetkapcsolatod.')
  })
})
