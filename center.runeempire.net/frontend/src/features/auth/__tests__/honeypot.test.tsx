/**
 * The bot trap (owner, 2026-11-16): the registration and the forgotten password
 * form carry a hidden "newsletter" checkbox that a human never sees or ticks.
 * A bot that ticks it gets a normal-looking answer from the backend, but
 * nothing is mailed. The real form must never send it ticked.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router'
import { afterEach, beforeAll, describe, expect, it } from 'vitest'

import { ForgotPasswordForm } from '@/features/auth/ForgotPasswordForm'
import { RegisterForm } from '@/features/auth/RegisterForm'
import { installFakeBackend, stubBrowserApis } from '@/test/fakeBackend'

/** The bodies the forms sent, by route. */
function backend() {
  const bodies: Record<string, unknown>[] = []
  installFakeBackend({
    'POST /auth/register': (config) => {
      const body = JSON.parse(config.data as string) as Record<string, unknown>
      bodies.push(body)
      return { status: 202, data: { data: { email: body.email, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() } } }
    },
    'POST /auth/password/forgot': (config) => {
      const body = JSON.parse(config.data as string) as Record<string, unknown>
      bodies.push(body)
      const now = Date.now()
      return {
        status: 202,
        data: { data: { email: body.email, expires_at: new Date(now + 15 * 60_000).toISOString(), resend_at: new Date(now + 600_000).toISOString() } },
      }
    },
  })
  return bodies
}

function renderWith(page: React.ReactNode) {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MemoryRouter>{page}</MemoryRouter>
    </QueryClientProvider>,
  )
}

/** The trap's native input, the way a form-filling bot finds it. */
const trap = (container: HTMLElement) => container.querySelector<HTMLInputElement>('input[name="newsletter"]')

/** Fills the registration like a person: every checkbox a person can reach gets ticked. */
function fillDetails() {
  fireEvent.change(screen.getByLabelText('Játékosnév'), { target: { value: 'Steve_01' } })
  fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
  fireEvent.change(screen.getByLabelText('Jelszó'), { target: { value: 'jelszo-2026' } })
  fireEvent.change(screen.getByLabelText('Jelszó újra'), { target: { value: 'jelszo-2026' } })
  for (const box of screen.getAllByRole('checkbox')) {
    if (box.getAttribute('aria-checked') !== 'true') fireEvent.click(box)
  }
}

describe('the hidden bot trap', () => {
  beforeAll(stubBrowserApis)
  afterEach(cleanup)

  it('is hidden from people, screen readers and the Tab key', () => {
    const { container } = renderWith(<RegisterForm />)
    const box = trap(container)

    expect(box).not.toBeNull()
    expect(box?.tabIndex).toBe(-1)
    expect(box?.closest('[aria-hidden="true"]')).not.toBeNull()
    expect(screen.getAllByRole('checkbox')).not.toContain(box)
  })

  it('a person registering never sends it', async () => {
    const bodies = backend()
    renderWith(<RegisterForm />)
    fillDetails()
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    await screen.findByRole('heading', { name: 'Nézd meg az e-mailed' })

    expect(bodies).toHaveLength(1)
    expect(bodies[0]).not.toHaveProperty('newsletter')
  })

  it('a bot ticking it on the registration sends it', async () => {
    const bodies = backend()
    const { container } = renderWith(<RegisterForm />)
    fillDetails()
    fireEvent.click(trap(container)!)
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    await screen.findByRole('heading', { name: 'Nézd meg az e-mailed' })

    expect(bodies[0]).toMatchObject({ newsletter: true })
  })

  it('the forgotten password form: a person never sends it, a bot ticking it does', async () => {
    const bodies = backend()
    const { container } = renderWith(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    await screen.findByLabelText('Kód az e-mailből')
    expect(bodies[0]).not.toHaveProperty('newsletter')

    cleanup()
    const second = renderWith(<ForgotPasswordForm />)
    fireEvent.change(screen.getByLabelText('E-mail cím'), { target: { value: 'steve@example.com' } })
    fireEvent.click(trap(second.container)!)
    fireEvent.click(screen.getByRole('button', { name: 'Kód küldése' }))
    await screen.findByLabelText('Kód az e-mailből')
    expect(bodies[1]).toMatchObject({ newsletter: true })
    expect(trap(container)).toBeNull()
  })
})
