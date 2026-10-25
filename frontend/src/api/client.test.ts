import { afterEach, beforeEach, describe, expect, it, vi, type Mock } from 'vitest'
import { ApiError, configureApiClient, errorMessage, request, requestBlob } from './client'

const json = (status: number, body?: unknown) =>
  new Response(body === undefined ? null : JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json' } })

let fetchMock: ReturnType<typeof vi.fn>
let unauthorized: Mock<() => void>

beforeEach(() => {
  fetchMock = vi.fn()
  unauthorized = vi.fn<() => void>()
  vi.stubGlobal('fetch', fetchMock)
  configureApiClient({ getToken: async () => 'tok-123', onUnauthorized: unauthorized })
})
afterEach(() => vi.unstubAllGlobals())

describe('request', () => {
  it('builds the URL from the configured base and drops empty query params', async () => {
    fetchMock.mockResolvedValue(json(200, []))
    await request('/api/events', { query: { search: 'hack', category: '', event_date: undefined, club_id: null } })
    const url = String(fetchMock.mock.calls[0][0])
    expect(url).toBe('http://localhost:8000/api/events?search=hack')
  })

  it('attaches the bearer token only for authenticated calls', async () => {
    fetchMock.mockImplementation(async () => json(200, {}))
    await request('/health')
    await request('/users/me', { auth: true })
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBeUndefined()
    expect(fetchMock.mock.calls[1][1].headers.Authorization).toBe('Bearer tok-123')
  })

  it('does not call the network and signals sign-in when no token is available', async () => {
    configureApiClient({ getToken: async () => null, onUnauthorized: unauthorized })
    await expect(request('/users/me', { auth: true })).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).not.toHaveBeenCalled()
    expect(unauthorized).toHaveBeenCalled()
  })

  it('sends JSON bodies with a content type', async () => {
    fetchMock.mockResolvedValue(json(201, {}))
    await request('/api/feedback', { method: 'POST', body: { rating: 5 } })
    const init = fetchMock.mock.calls[0][1]
    expect(init.method).toBe('POST')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(init.body).toBe('{"rating":5}')
  })

  it('surfaces the backend detail string', async () => {
    fetchMock.mockResolvedValue(json(409, { detail: 'Event capacity has been reached' }))
    const err = await request('/x').catch((e) => e)
    expect(err).toBeInstanceOf(ApiError)
    expect(err).toMatchObject({ status: 409, detail: 'Event capacity has been reached' })
    expect(errorMessage(err)).toBe('Event capacity has been reached')
  })

  it('parses FastAPI 422 validation errors into field errors', async () => {
    fetchMock.mockResolvedValue(json(422, { detail: [{ loc: ['body', 'capacity'], msg: 'Input should be greater than 0' }] }))
    const err = (await request('/x').catch((e) => e)) as ApiError
    expect(err.fieldErrors).toEqual({ capacity: 'Input should be greater than 0' })
  })

  it('calls onUnauthorized on a 401 from an authenticated request', async () => {
    fetchMock.mockResolvedValue(json(401, { detail: 'Invalid Microsoft access token' }))
    await expect(request('/users/me', { auth: true })).rejects.toMatchObject({ isUnauthorized: true })
    expect(unauthorized).toHaveBeenCalledTimes(1)
  })

  it('reports an unreachable API (e.g. CORS or backend down) as a network error', async () => {
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    const err = (await request('/x').catch((e) => e)) as ApiError
    expect(err.isNetworkError).toBe(true)
    expect(err.detail).toMatch(/Could not reach the EventHub API/)
  })

  it('gives a friendly message for 5xx responses with non-JSON bodies', async () => {
    fetchMock.mockResolvedValue(new Response('<html>Bad gateway</html>', { status: 502 }))
    const err = (await request('/x').catch((e) => e)) as ApiError
    expect(err.status).toBe(502)
    expect(err.detail).toMatch(/server ran into a problem/)
  })
})

describe('requestBlob', () => {
  it('sends the bearer token and returns the file with the filename from Content-Disposition', async () => {
    fetchMock.mockResolvedValue(new Response('%PDF-1.4', { status: 200, headers: { 'Content-Disposition': 'attachment; filename="certificate-EVH-1.pdf"' } }))
    const out = await requestBlob('/api/certificates/abc/download')
    expect(fetchMock.mock.calls[0][1].headers.Authorization).toBe('Bearer tok-123')
    expect(out.filename).toBe('certificate-EVH-1.pdf')
    expect(await out.blob.text()).toBe('%PDF-1.4')
  })

  it('returns a null filename when the header is not readable (CORS)', async () => {
    fetchMock.mockResolvedValue(new Response('x', { status: 200 }))
    expect((await requestBlob('/x')).filename).toBeNull()
  })

  it('does not call the network without a token', async () => {
    configureApiClient({ getToken: async () => null, onUnauthorized: unauthorized })
    await expect(requestBlob('/x')).rejects.toMatchObject({ status: 401 })
    expect(fetchMock).not.toHaveBeenCalled()
  })

  it.each([
    [403, 'You can only download your own certificates'],
    [404, 'Certificate not found'],
  ])('surfaces the JSON detail of a %i response', async (status, detail) => {
    fetchMock.mockResolvedValue(json(status, { detail }))
    await expect(requestBlob('/x')).rejects.toMatchObject({ status, detail })
  })

  it('gives a friendly message for non-JSON 500 responses and unreachable servers', async () => {
    fetchMock.mockResolvedValue(new Response('boom', { status: 500 }))
    await expect(requestBlob('/x')).rejects.toMatchObject({ status: 500, detail: expect.stringMatching(/server ran into a problem/) })
    fetchMock.mockRejectedValue(new TypeError('Failed to fetch'))
    await expect(requestBlob('/x')).rejects.toMatchObject({ isNetworkError: true })
  })
})
