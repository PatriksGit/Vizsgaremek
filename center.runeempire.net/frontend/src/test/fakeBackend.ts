import { AxiosError, type AxiosResponse, type InternalAxiosRequestConfig } from 'axios'

import { http } from '@/lib/api'

/**
 * Test-only fake of the Laravel API, plugged in as the axios adapter of the
 * real client, so the interceptors and toApiError still run. Non-2xx answers
 * are rejected the way axios's own settle() does it.
 */
export type Reply = { status: number; data?: unknown; headers?: Record<string, string> }
export type Handler = (config: InternalAxiosRequestConfig) => Reply | Promise<Reply>

export function answer(config: InternalAxiosRequestConfig, { status, data, headers = {} }: Reply): Promise<AxiosResponse> {
  const response: AxiosResponse = { data, status, statusText: String(status), headers, config, request: {} }
  if (status >= 200 && status < 300) return Promise.resolve(response)
  return Promise.reject(
    new AxiosError(
      `Request failed with status code ${status}`,
      status >= 500 ? AxiosError.ERR_BAD_RESPONSE : AxiosError.ERR_BAD_REQUEST,
      config,
      {},
      response,
    ),
  )
}

export function installFakeBackend(routes: Record<string, Handler>) {
  const calls: string[] = []
  http.defaults.adapter = async (config) => {
    const key = `${config.method?.toUpperCase()} ${config.url}`
    calls.push(key)
    if (key === 'GET /sanctum/csrf-cookie') return answer(config, { status: 204 })
    const handler = routes[key]
    if (!handler) return answer(config, { status: 404, data: { message: `no fake for ${key}` } })
    return answer(config, await handler(config))
  }
  return calls
}

/** jsdom lacks these browser APIs; the components only need them to exist. */
export function stubBrowserApis() {
  window.matchMedia ??= ((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addEventListener: () => {},
    removeEventListener: () => {},
    addListener: () => {},
    removeListener: () => {},
    dispatchEvent: () => false,
  })) as unknown as typeof window.matchMedia
  globalThis.ResizeObserver ??= class {
    observe() {}
    unobserve() {}
    disconnect() {}
  } as unknown as typeof ResizeObserver
  document.elementFromPoint ??= () => null
  // Base UI's checkbox clicks its hidden input with a PointerEvent.
  window.PointerEvent ??= class extends MouseEvent {} as unknown as typeof PointerEvent
  window.scrollTo = () => {}
  // react-router's data router builds a Node Request with jsdom's AbortSignal, which Node refuses.
  // The app has no loaders, so the signal is dropped.
  const NodeRequest = globalThis.Request
  if (!(NodeRequest as { stubbed?: boolean }).stubbed) {
    globalThis.Request = class extends NodeRequest {
      static stubbed = true
      constructor(input: RequestInfo | URL, init?: RequestInit) {
        const { signal: _signal, ...rest } = init ?? {}
        void _signal
        super(input, rest)
      }
    } as typeof Request
  }
}
