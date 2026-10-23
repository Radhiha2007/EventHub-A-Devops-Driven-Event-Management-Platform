import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { configureApiClient } from './client'
import { api } from './endpoints'

let fetchMock: ReturnType<typeof vi.fn>
beforeEach(() => {
  fetchMock = vi.fn(async () => new Response('{}', { status: 200 }))
  vi.stubGlobal('fetch', fetchMock)
  configureApiClient({ getToken: async () => 'T', onUnauthorized: () => {} })
})
afterEach(() => vi.unstubAllGlobals())

/** [method, path+query, authed, body] of the last request. */
async function call(fn: () => Promise<unknown>) {
  await fn()
  const [url, init] = fetchMock.mock.calls.at(-1)!
  const u = new URL(String(url))
  return {
    method: init.method as string,
    path: u.pathname + u.search,
    authed: Boolean(init.headers.Authorization),
    body: init.body ? JSON.parse(init.body as string) : undefined,
  }
}

const ID = '11111111-1111-4111-8111-111111111111'

// Each expectation below was checked against backend/app/routers/*.py.
describe('API contract', () => {
  it('health / profile / onboarding', async () => {
    expect(await call(() => api.health())).toEqual({ method: 'GET', path: '/health', authed: false, body: undefined })
    expect(await call(() => api.getMyProfile())).toMatchObject({ method: 'GET', path: '/users/me', authed: true })
    expect(await call(() => api.completeOnboarding('CLUB'))).toMatchObject({
      method: 'POST', path: '/users/me/onboarding', authed: true, body: { role: 'CLUB' },
    })
  })

  it('clubs: reads are public, writes are authenticated', async () => {
    expect(await call(() => api.listClubs())).toMatchObject({ method: 'GET', path: '/api/clubs', authed: false })
    expect(await call(() => api.getClub(ID))).toMatchObject({ path: `/api/clubs/${ID}`, authed: false })
    expect(await call(() => api.createClub({ name: 'Robotics' }))).toMatchObject({ method: 'POST', path: '/api/clubs', authed: true })
    expect(await call(() => api.updateClub(ID, { name: 'R2' }))).toMatchObject({ method: 'PUT', path: `/api/clubs/${ID}`, authed: true })
  })

  it('events: list uses the backend query names, writes are authenticated', async () => {
    const r = await call(() => api.listEvents({ search: 'x', category: 'Tech', event_status: 'UPCOMING', club_id: ID }))
    expect(r).toMatchObject({ method: 'GET', authed: false })
    const q = new URL('http://x' + r.path).searchParams
    expect(Object.fromEntries(q)).toEqual({ search: 'x', category: 'Tech', event_status: 'UPCOMING', club_id: ID })
    expect(await call(() => api.getEvent(ID))).toMatchObject({ path: `/api/events/${ID}`, authed: false })
    expect(await call(() => api.updateEvent(ID, { title: 'T' }))).toMatchObject({ method: 'PUT', authed: true })
    expect(await call(() => api.updateEventStatus(ID, 'COMPLETED'))).toMatchObject({
      method: 'PATCH', path: `/api/events/${ID}/status`, authed: true, body: { status: 'COMPLETED' },
    })
  })

  it('registrations and check-in', async () => {
    expect(await call(() => api.registerForEvent(ID))).toEqual({ method: 'POST', path: `/api/events/${ID}/registrations`, authed: true, body: undefined })
    expect(await call(() => api.listEventRegistrations(ID))).toMatchObject({ method: 'GET', path: `/api/events/${ID}/registrations`, authed: true })
    expect(await call(() => api.checkIn('c'.repeat(43)))).toMatchObject({
      method: 'POST', path: '/api/attendance/check-in', authed: true, body: { credential: 'c'.repeat(43) },
    })
  })

  it('feedback POST and all notification routes are authenticated; feedback list is public', async () => {
    expect(await call(() => api.submitFeedback({ event_id: ID, rating: 4, comments: null }))).toMatchObject({ method: 'POST', path: '/api/feedback', authed: true })
    expect(await call(() => api.listEventFeedback(ID))).toMatchObject({ path: `/api/feedback/event/${ID}`, authed: false })
    expect(await call(() => api.listNotifications(ID, true))).toMatchObject({ path: `/api/notifications/recipient/${ID}?unread_only=true`, authed: true })
    expect(await call(() => api.listNotifications(ID))).toMatchObject({ path: `/api/notifications/recipient/${ID}`, authed: true })
    expect(await call(() => api.setNotificationRead(ID, true))).toMatchObject({ method: 'PATCH', path: `/api/notifications/${ID}/read`, authed: true, body: { is_read: true } })
  })

  it('student registrations and QR re-issue', async () => {
    expect(await call(() => api.listMyRegistrations())).toMatchObject({ method: 'GET', path: '/api/registrations/me', authed: true })
    expect(await call(() => api.reissueQr(ID))).toMatchObject({ method: 'POST', path: `/api/registrations/${ID}/qr-credential`, authed: true })
  })

  it('certificates', async () => {
    expect(await call(() => api.issueCertificate({ event_id: ID, recipient_id: ID, recipient_name: 'A' }))).toMatchObject({
      method: 'POST', path: '/api/certificates/issue', authed: true, body: { event_id: ID, recipient_id: ID, recipient_name: 'A' },
    })
    expect(await call(() => api.listMyCertificates(ID))).toMatchObject({ path: `/api/certificates/recipient/${ID}`, authed: true })
    expect(await call(() => api.verifyCertificate('EVH-ABC'))).toMatchObject({ path: '/api/certificates/verify/EVH-ABC', authed: false })
    expect(await call(() => api.downloadCertificate(ID))).toMatchObject({ method: 'GET', path: `/api/certificates/${ID}/download`, authed: true })
  })

  it('exposes no endpoint the backend lacks (no delete event)', () => {
    const names = Object.keys(api)
    expect(names.some((n) => /delete/i.test(n))).toBe(false)
  })
})
