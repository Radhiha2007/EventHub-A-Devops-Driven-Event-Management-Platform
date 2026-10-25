import { config } from '@/config'

/** Error raised for every non-2xx response and for network failures. */
export class ApiError extends Error {
  readonly status: number
  /** Backend `detail` string when present. */
  readonly detail: string
  /** Field-level messages parsed from FastAPI 422 responses, keyed by field name. */
  readonly fieldErrors: Record<string, string>
  readonly isNetworkError: boolean

  constructor(opts: {
    status: number
    detail: string
    fieldErrors?: Record<string, string>
    isNetworkError?: boolean
  }) {
    super(opts.detail)
    this.name = 'ApiError'
    this.status = opts.status
    this.detail = opts.detail
    this.fieldErrors = opts.fieldErrors ?? {}
    this.isNetworkError = opts.isNetworkError ?? false
  }

  get isUnauthorized() {
    return this.status === 401
  }
  get isForbidden() {
    return this.status === 403
  }
  get isNotFound() {
    return this.status === 404
  }
}

type TokenGetter = () => Promise<string | null>
type UnauthorizedHandler = () => void

let getToken: TokenGetter = async () => null
let onUnauthorized: UnauthorizedHandler = () => {}

/** Called once by the auth layer so the client can attach bearer tokens. */
export function configureApiClient(opts: {
  getToken: TokenGetter
  onUnauthorized: UnauthorizedHandler
}) {
  getToken = opts.getToken
  onUnauthorized = opts.onUnauthorized
}

interface FastApiValidationItem {
  loc?: (string | number)[]
  msg?: string
}

function parseDetail(body: unknown, fallback: string): {
  detail: string
  fieldErrors: Record<string, string>
} {
  const fieldErrors: Record<string, string> = {}
  if (body && typeof body === 'object' && 'detail' in body) {
    const d = (body as { detail: unknown }).detail
    if (typeof d === 'string') return { detail: d, fieldErrors }
    if (Array.isArray(d)) {
      const msgs: string[] = []
      for (const item of d as FastApiValidationItem[]) {
        const field = item.loc?.filter((p) => p !== 'body' && typeof p === 'string').join('.')
        const msg = item.msg ?? 'Invalid value'
        if (field) fieldErrors[field] = msg
        msgs.push(field ? `${field}: ${msg}` : msg)
      }
      return { detail: msgs.join('; ') || fallback, fieldErrors }
    }
  }
  return { detail: fallback, fieldErrors }
}

export interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  query?: Record<string, string | number | boolean | undefined | null>
  body?: unknown
  /** Attach the bearer token. Public endpoints leave this false. */
  auth?: boolean
  signal?: AbortSignal
}

export async function request<T>(path: string, opts: RequestOptions = {}): Promise<T> {
  const url = new URL(config.apiBaseUrl + path)
  for (const [k, v] of Object.entries(opts.query ?? {})) {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, String(v))
  }

  const headers: Record<string, string> = { Accept: 'application/json' }
  if (opts.body !== undefined) headers['Content-Type'] = 'application/json'

  if (opts.auth) {
    let token: string | null
    try {
      token = await getToken()
    } catch {
      token = null
    }
    if (!token) {
      onUnauthorized()
      throw new ApiError({ status: 401, detail: 'You need to sign in to do that.' })
    }
    headers.Authorization = `Bearer ${token}`
  }

  let res: Response
  try {
    res = await fetch(url, {
      method: opts.method ?? 'GET',
      headers,
      body: opts.body !== undefined ? JSON.stringify(opts.body) : undefined,
      signal: opts.signal,
    })
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') throw err
    throw new ApiError({
      status: 0,
      isNetworkError: true,
      detail:
        `Could not reach the EventHub API at ${config.apiBaseUrl}. ` +
        'Check that the backend is running and that CORS allows this origin.',
    })
  }

  // Tolerate empty and non-JSON bodies (e.g. 204, proxy HTML error pages).
  const text = await res.text()
  let parsed: unknown = undefined
  if (text) {
    try {
      parsed = JSON.parse(text)
    } catch {
      parsed = undefined
    }
  }

  if (!res.ok) {
    const fallback =
      res.status >= 500
        ? 'The server ran into a problem. Please try again.'
        : `Request failed (${res.status}).`
    const { detail, fieldErrors } = parseDetail(parsed, fallback)
    if (res.status === 401 && opts.auth) onUnauthorized()
    throw new ApiError({ status: res.status, detail, fieldErrors })
  }

  return parsed as T
}

export function errorMessage(err: unknown): string {
  if (err instanceof ApiError) return err.detail
  if (err instanceof Error) return err.message
  return 'Something went wrong.'
}

/**
 * Authenticated download of a binary file (e.g. a certificate PDF).
 * Errors use the same ApiError shape as request(). The filename is read from
 * Content-Disposition when the browser is allowed to see it (CORS expose_headers), else null.
 */
export async function requestBlob(path: string): Promise<{ blob: Blob; filename: string | null }> {
  let token: string | null
  try {
    token = await getToken()
  } catch {
    token = null
  }
  if (!token) {
    onUnauthorized()
    throw new ApiError({ status: 401, detail: 'You need to sign in to do that.' })
  }

  let res: Response
  try {
    res = await fetch(config.apiBaseUrl + path, { method: 'GET', headers: { Authorization: `Bearer ${token}` } })
  } catch {
    throw new ApiError({
      status: 0,
      isNetworkError: true,
      detail:
        `Could not reach the EventHub API at ${config.apiBaseUrl}. ` +
        'Check that the backend is running and that CORS allows this origin.',
    })
  }

  if (!res.ok) {
    let body: unknown
    try {
      body = await res.json()
    } catch {
      body = undefined
    }
    const fallback =
      res.status >= 500 ? 'The server ran into a problem. Please try again.' : `Download failed (${res.status}).`
    const { detail } = parseDetail(body, fallback)
    if (res.status === 401) onUnauthorized()
    throw new ApiError({ status: res.status, detail })
  }

  const match = /filename="?([^";]+)"?/i.exec(res.headers.get('Content-Disposition') ?? '')
  return { blob: await res.blob(), filename: match?.[1] ?? null }
}
