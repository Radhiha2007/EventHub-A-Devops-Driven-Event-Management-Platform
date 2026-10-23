import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api/client'
import type { EventItem, Registration } from '@/api/types'
import { baseEvent, renderWithProviders } from '@/test/utils'
import { ClubContext } from './ClubContext'
import { EventManagePage } from './EventManagePage'

const apiMock = vi.hoisted(() => ({
  getEvent: vi.fn(),
  listEventRegistrations: vi.fn(),
  updateEventStatus: vi.fn(),
  issueCertificate: vi.fn(),
  listEventFeedback: vi.fn(),
  checkIn: vi.fn(),
}))
vi.mock('@/api/endpoints', () => ({ api: apiMock }))

const club = { id: baseEvent.club_id, name: 'Code Club', description: null, contact_email: 'club@uni.edu', advisor_name: null, created_at: '2026-01-01T00:00:00' }
const regs: Registration[] = [
  { id: 'r1', event_id: baseEvent.id, attendee_name: 'Asha Rao', attendee_email: 'asha@uni.edu', registered_at: '2026-10-01T00:00:00', checked_in_at: '2026-10-19T10:00:00' },
  { id: 'r2', event_id: baseEvent.id, attendee_name: 'Ben Roy', attendee_email: 'ben@uni.edu', registered_at: '2026-10-02T00:00:00', checked_in_at: null },
]
const UUID = '99999999-9999-4999-8999-999999999999'

function renderPage(event: EventItem, ownClubs = [club]) {
  apiMock.getEvent.mockResolvedValue(event)
  apiMock.listEventRegistrations.mockResolvedValue(regs)
  apiMock.listEventFeedback.mockResolvedValue([])
  return renderWithProviders(
    <ClubContext.Provider value={{ clubs: ownClubs, club: ownClubs[0] ?? null, setClubId: () => {} }}>
      <EventManagePage />
    </ClubContext.Provider>,
    { route: `/club/events/${event.id}`, path: '/club/events/:eventId' },
  )
}
beforeEach(() => vi.clearAllMocks())

describe('Club event management', () => {
  it('lists the roster from the API with check-in state and never shows a student ID or QR credential', async () => {
    renderPage(baseEvent)
    expect(await screen.findByText('Asha Rao')).toBeInTheDocument()
    expect(screen.getByText('Ben Roy')).toBeInTheDocument()
    expect(screen.getByText('Not checked in')).toBeInTheDocument()
    expect(screen.getByText(/2 of 50 seats registered · 1 checked in/)).toBeInTheDocument()
  })

  it('offers only the transitions the backend allows, and no delete action', async () => {
    renderPage(baseEvent)
    expect(await screen.findByRole('button', { name: 'Mark as Ongoing' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as Completed' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark as Cancelled' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /delete/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /mark as upcoming/i })).not.toBeInTheDocument()
  })

  it('confirms before changing status and sends PATCH via the API', async () => {
    apiMock.updateEventStatus.mockResolvedValue({ ...baseEvent, status: 'ONGOING' })
    renderPage(baseEvent)
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as Ongoing' }))
    expect(apiMock.updateEventStatus).not.toHaveBeenCalled()
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(apiMock.updateEventStatus).toHaveBeenCalledWith(baseEvent.id, 'ONGOING')
  })

  it('shows the backend error if the status change is rejected', async () => {
    apiMock.updateEventStatus.mockRejectedValue(new ApiError({ status: 400, detail: 'Cannot change event status from COMPLETED to ONGOING' }))
    renderPage(baseEvent)
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as Ongoing' }))
    await userEvent.click(screen.getByRole('button', { name: 'Confirm' }))
    expect(await screen.findByText(/Cannot change event status/)).toBeInTheDocument()
  })

  it('has no transitions once an event is completed', async () => {
    renderPage({ ...baseEvent, status: 'COMPLETED' })
    expect(await screen.findByText(/can't be changed any further/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Mark as/ })).not.toBeInTheDocument()
  })

  it('refuses to manage an event of a club the account does not own', async () => {
    renderPage(baseEvent, [])
    expect(await screen.findByText(/can't manage this event/i)).toBeInTheDocument()
    expect(apiMock.listEventRegistrations).not.toHaveBeenCalled()
  })

  it('blocks certificate issuance until the event is completed', async () => {
    renderPage(baseEvent)
    await userEvent.click(await screen.findByRole('tab', { name: 'Certificates' }))
    expect(await screen.findByText(/only be issued for completed events/i)).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /issue certificate/i })).not.toBeInTheDocument()
  })

  it('issues a certificate with a student-supplied UUID, validating it first', async () => {
    apiMock.issueCertificate.mockResolvedValue({ id: 'c', event_id: baseEvent.id, recipient_id: UUID, recipient_name: 'Asha Rao', certificate_code: 'EVH-ABC123', issued_at: '2026-10-19T11:00:00' })
    renderPage({ ...baseEvent, status: 'COMPLETED' })
    await userEvent.click(await screen.findByRole('tab', { name: 'Certificates' }))
    expect(await screen.findByText(/need the student's EventHub ID/i)).toBeInTheDocument()

    await userEvent.selectOptions(screen.getByRole('combobox'), 'r1') // only the checked-in attendee is offered
    expect(screen.queryByRole('option', { name: /Ben Roy/ })).not.toBeInTheDocument()
    await userEvent.type(screen.getByLabelText(/student's eventhub id/i), 'not-a-uuid')
    await userEvent.click(screen.getByRole('button', { name: /issue certificate/i }))
    expect(screen.getByText(/must be a valid UUID/i)).toBeInTheDocument()
    expect(apiMock.issueCertificate).not.toHaveBeenCalled()

    await userEvent.clear(screen.getByLabelText(/student's eventhub id/i))
    await userEvent.type(screen.getByLabelText(/student's eventhub id/i), UUID)
    await userEvent.click(screen.getByRole('button', { name: /issue certificate/i }))
    expect(apiMock.issueCertificate).toHaveBeenCalledWith({ event_id: baseEvent.id, recipient_id: UUID, recipient_name: 'Asha Rao' })
    expect(await screen.findByText('EVH-ABC123')).toBeInTheDocument()
  })
})
