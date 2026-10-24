
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api/client'
import { baseEvent, clubUser, renderWithProviders, student } from '@/test/utils'
import { loadTickets } from '@/lib/tickets'
import { EventDetailPage } from './EventDetailPage'

const auth = vi.hoisted(() => ({ value: {} as Record<string, unknown> }))
vi.mock('@/auth/AuthProvider', () => ({ useAuth: () => auth.value }))

const apiMock = vi.hoisted(() => ({
  getEvent: vi.fn(),
  getClub: vi.fn(),
  registerForEvent: vi.fn(),
  listMyRegistrations: vi.fn(),
  reissueQr: vi.fn(),
  listEventFeedback: vi.fn(),
  submitFeedback: vi.fn(),
}))
vi.mock('@/api/endpoints', () => ({ api: apiMock }))

const CRED = 'abcdefghijklmnopqrstuvwxyz0123456789ABCDEFG'

const renderPage = () =>
  renderWithProviders(<EventDetailPage />, {
    route: `/events/${baseEvent.id}`,
    path: '/events/:eventId',
  })

beforeEach(() => {
  localStorage.clear()
  vi.clearAllMocks()
  auth.value = { status: 'signed-in', profile: student }
  apiMock.getEvent.mockResolvedValue(baseEvent)
  apiMock.getClub.mockResolvedValue({
    id: baseEvent.club_id,
    name: 'Code Club',
    contact_email: 'club@uni.edu',
  })
  apiMock.listEventFeedback.mockResolvedValue([])
  apiMock.listMyRegistrations.mockResolvedValue([])
})

describe('Event detail → registration', () => {
  it('shows real event data from the API (no club_name / seat count invented)', async () => {
    renderPage()

    expect(
      await screen.findByRole('heading', { level: 1, name: 'Hack Night' }),
    ).toBeInTheDocument()

    expect(
      await screen.findByRole('link', { name: 'Code Club' }),
    ).toBeInTheDocument()

    expect(screen.getByText('50 seats')).toBeInTheDocument()
    expect(screen.queryByText(/seats left|remaining/i)).not.toBeInTheDocument()
  })

  it('registers via the endpoint and shows the one-time QR credential, saved locally', async () => {
    const registration = {
      id: 'reg-1',
      event_id: baseEvent.id,
      attendee_name: 'Stu Dent',
      attendee_email: 'stu@uni.edu',
      registered_at: '2026-10-19T10:00:00',
      checked_in_at: null,
      qr_credential: CRED,
    }

    apiMock.registerForEvent.mockImplementation(async () => {
      apiMock.listMyRegistrations.mockResolvedValue([
        { ...registration, event: baseEvent },
      ])
      return registration
    })

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', {
        name: /register for this event/i,
      }),
    )

    expect(apiMock.registerForEvent).toHaveBeenCalledWith(baseEvent.id)

    expect(
      await screen.findByLabelText('Credential text'),
    ).toHaveTextContent(CRED)

    expect(
      screen.getByRole('img', { name: /check-in qr code/i }),
    ).toBeInTheDocument()

    expect(loadTickets(student.id)[0]).toMatchObject({
      eventId: baseEvent.id,
      credential: CRED,
    })
  })

  it('does not claim success when registration fails', async () => {
    apiMock.registerForEvent.mockRejectedValue(
      new ApiError({
        status: 409,
        detail: 'Event capacity has been reached',
      }),
    )

    renderPage()

    await userEvent.click(
      await screen.findByRole('button', {
        name: /register for this event/i,
      }),
    )

    expect(await screen.findByRole('alert')).toHaveTextContent(
      'Event capacity has been reached',
    )

    expect(screen.queryByText(/you're registered/i)).not.toBeInTheDocument()
    expect(loadTickets(student.id)).toEqual([])
  })

  it('shows an existing registration from the backend and re-issues the QR on request', async () => {
    const reg = {
      id: 'reg-1',
      event_id: baseEvent.id,
      attendee_name: 'Stu Dent',
      attendee_email: 'stu@uni.edu',
      registered_at: '2026-10-19T10:00:00',
      checked_in_at: null,
      event: baseEvent,
    }

    apiMock.listMyRegistrations.mockResolvedValue([reg])
    apiMock.reissueQr.mockResolvedValue({ qr_credential: CRED })

    renderPage()

    expect(
      await screen.findByText("You're registered 🎉"),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole('button', {
        name: /register for this event/i,
      }),
    ).not.toBeInTheDocument()

    await userEvent.click(
      screen.getByRole('button', { name: /show my qr code/i }),
    )

    await userEvent.click(screen.getByRole('button', { name: 'Generate' }))

    expect(apiMock.reissueQr).toHaveBeenCalledWith('reg-1')

    expect(
      await screen.findByLabelText('Credential text'),
    ).toHaveTextContent(CRED)
  })

  it('shows checked-in state instead of a QR once attended', async () => {
    apiMock.listMyRegistrations.mockResolvedValue([
      {
        id: 'reg-1',
        event_id: baseEvent.id,
        attendee_name: 'S',
        attendee_email: 's@u.edu',
        registered_at: '2026-10-19T10:00:00',
        checked_in_at: '2026-10-20T10:00:00',
        event: baseEvent,
      },
    ])

    renderPage()

    expect(
      await screen.findByText(/you're checked in/i),
    ).toBeInTheDocument()
  })

  it('disables registration when the deadline has passed', async () => {
    apiMock.getEvent.mockResolvedValue({
      ...baseEvent,
      registration_deadline: '2020-01-01T00:00:00',
    })

    renderPage()

    expect(
      await screen.findByRole('button', {
        name: /register for this event/i,
      }),
    ).toBeDisabled()

    expect(screen.getByText(/registration closed on/i)).toBeInTheDocument()
  })

  it('asks signed-out visitors to sign in', async () => {
    auth.value = { status: 'signed-out', profile: null }

    renderPage()

    expect(
      await screen.findByRole('link', {
        name: /sign in to register/i,
      }),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole('button', {
        name: /register for this event/i,
      }),
    ).not.toBeInTheDocument()
  })

  it('does not offer registration to club accounts', async () => {
    auth.value = { status: 'signed-in', profile: clubUser }

    renderPage()

    expect(
      await screen.findByText(/registration is for student accounts/i),
    ).toBeInTheDocument()

    expect(
      screen.queryByRole('button', {
        name: /register for this event/i,
      }),
    ).not.toBeInTheDocument()
  })

  it('shows an error state (not an empty page) when the event fails to load', async () => {
    apiMock.getEvent.mockRejectedValue(
      new ApiError({ status: 404, detail: 'Event not found' }),
    )

    renderPage()

    await waitFor(() =>
      expect(screen.getByRole('alert')).toHaveTextContent('Event not found'),
    )
  })
})

