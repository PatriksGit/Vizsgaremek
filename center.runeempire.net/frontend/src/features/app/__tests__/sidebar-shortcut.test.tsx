/**
 * Regression test (review 2026-11-17, UI-1). The bug it guards against: AppLayout wraps the logged-in pages in shadcn's
 * SidebarProvider, but the sidebar is collapsible="none" (AppSidebar.tsx), so
 * it can never collapse. SidebarProvider still listens to Ctrl/Cmd+B on the
 * window (ui/sidebar.tsx), swallows the browser's own shortcut
 * (preventDefault) and writes a `sidebar_state` cookie (path=/, 7 days) that
 * the browser then sends to the API with every request. The privacy notice's
 * cookie list (root CLAUDE.md) names only center_session, XSRF-TOKEN and
 * __cf_bm.
 *
 * Happens when: a logged-in player presses Ctrl+B (Firefox: bookmarks sidebar).
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { cleanup, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router'
import { afterEach, beforeEach, expect, it, vi } from 'vitest'

import { AppLayout } from '@/features/app/AppLayout'
import { stubBrowserApis } from '@/test/fakeBackend'

const getMock = vi.hoisted(() => vi.fn())

vi.mock('@/lib/api', async (importOriginal) => {
  const original = await importOriginal<typeof import('@/lib/api')>()
  return { ...original, http: { get: getMock } }
})

beforeEach(() => {
  stubBrowserApis()
  getMock.mockImplementation(async (url: string) => {
    if (url === '/auth/me') {
      return { data: { data: { uuid: 'u', username: 'reprouser', display_name: 'ReproUser', registered_at: null } } }
    }
    throw new Error(`unexpected GET ${url}`)
  })
})

afterEach(() => {
  cleanup()
  document.cookie = 'sidebar_state=; path=/; max-age=0'
})

async function renderLayout() {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={['/rangok']}>
        <Routes>
          <Route element={<AppLayout />}>
            <Route path="rangok" element={<h1>Megnyitott oldal</h1>} />
          </Route>
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  )
  expect(await screen.findByText('Megnyitott oldal')).toBeTruthy()
}

function press(init: KeyboardEventInit) {
  const event = new KeyboardEvent('keydown', { bubbles: true, cancelable: true, ...init })
  window.dispatchEvent(event)
  return event
}

it('Ctrl+B keeps the browser shortcut and writes no cookie', async () => {
  await renderLayout()
  expect(document.cookie).not.toContain('sidebar_state')

  const event = press({ key: 'b', ctrlKey: true })

  // The browser keeps its own Ctrl+B, and the site sets no cookie for a sidebar that cannot collapse.
  expect({ prevented: event.defaultPrevented, cookie: document.cookie }).toEqual({ prevented: false, cookie: '' })
})

it('a plain B key press is left alone', async () => {
  await renderLayout()

  const event = press({ key: 'b' })

  expect({ prevented: event.defaultPrevented, cookie: document.cookie }).toEqual({ prevented: false, cookie: '' })
})
