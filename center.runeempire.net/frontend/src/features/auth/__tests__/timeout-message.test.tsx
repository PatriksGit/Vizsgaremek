/**
 * Frontend review 2026-11-13d (auth-timeout-message): the registration request mails the code before
 * it answers (QUEUE_CONNECTION=sync), so a slow mail provider can keep it past
 * the client's 15 s timeout. The server got the request and mailed the code,
 * yet the page says it could not reach the server and blames the player's
 * internet connection.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { AxiosError, type InternalAxiosRequestConfig } from 'axios'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { RegisterForm } from '@/features/auth/RegisterForm'
import { http } from '@/lib/api'
import { answer, stubBrowserApis } from '@/test/fakeBackend'

/**
 * The adapter's two ways of getting no answer, as axios 1.21.1's xhr adapter
 * rejects them: request.ontimeout (lib/adapters/xhr.js:223-240, ECONNABORTED
 * with transitional.clarifyTimeoutError false) and request.onerror (ERR_NETWORK).
 */
function backendThatNeverAnswers(kind: 'timeout' | 'offline') {
  const mailed: string[] = []
  http.defaults.adapter = (config: InternalAxiosRequestConfig) => {
    if (config.url === '/sanctum/csrf-cookie') return answer(config, { status: 204 })
    if (kind === 'timeout') {
      // The request arrived: StartRegistration mailed the code, the answer came too late.
      mailed.push((JSON.parse(config.data as string) as { email: string }).email)
      const code = config.transitional?.clarifyTimeoutError ? AxiosError.ETIMEDOUT : AxiosError.ECONNABORTED
      return Promise.reject(new AxiosError(`timeout of ${config.timeout}ms exceeded`, code, config, {}))
    }
    return Promise.reject(new AxiosError('Network Error', AxiosError.ERR_NETWORK, config, {}))
  }
  return mailed
}

async function sendRegistration() {
  render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter initialEntries={['/register']}>
        <RegisterForm />
      </MemoryRouter>
    </QueryClientProvider>,
  )
  fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
  fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.change(screen.getByLabelText('Jelszó újra'), { target: { value: 'jelszo-2026' } })
  for (const box of screen.getAllByRole('checkbox')) fireEvent.click(box)
  fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
  return (await screen.findByRole('alert')).textContent ?? ''
}

describe('what the page says when the answer does not come', () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it('control: no connection at all -- the internet is the likely cause', async () => {
    backendThatNeverAnswers('offline')
    expect(await sendRegistration()).toContain('Ellenőrizd az internetkapcsolatod')
  })

  it('the server got the request and mailed the code but answered after 15 s', async () => {
    const mailed = backendThatNeverAnswers('timeout')
    const shown = await sendRegistration()

    expect(mailed).toEqual(['steve@example.com'])
    expect(shown).not.toContain('Nem sikerült elérni a szervert')
    expect(shown).not.toContain('Ellenőrizd az internetkapcsolatod')
  })
})
