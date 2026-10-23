import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api/client'
import { renderWithProviders } from '@/test/utils'
import { CheckInPanel } from './CheckInPanel'

const apiMock = vi.hoisted(() => ({ checkIn: vi.fn() }))
vi.mock('@/api/endpoints', () => ({ api: apiMock }))

const CRED = 'x'.repeat(43)
beforeEach(() => vi.clearAllMocks())

describe('CheckInPanel', () => {
  it('rejects credentials outside the backend length limits without calling the API', async () => {
    renderWithProviders(<CheckInPanel />)
    await userEvent.type(screen.getByLabelText(/qr credential/i), 'short')
    await userEvent.click(screen.getByRole('button', { name: /check in/i }))
    expect(screen.getByText(/32–128 characters/)).toBeInTheDocument()
    expect(apiMock.checkIn).not.toHaveBeenCalled()
  })

  it('checks an attendee in and reports success from the response', async () => {
    const done = vi.fn()
    apiMock.checkIn.mockResolvedValue({ registration_id: 'r', event_id: 'e', attendee_name: 'Stu Dent', checked_in_at: '2026-10-19T10:00:00' })
    renderWithProviders(<CheckInPanel onCheckedIn={done} />)
    await userEvent.type(screen.getByLabelText(/qr credential/i), CRED)
    await userEvent.click(screen.getByRole('button', { name: /check in/i }))
    expect(apiMock.checkIn).toHaveBeenCalledWith(CRED)
    expect(await screen.findByText(/Stu Dent is checked in/)).toBeInTheDocument()
    expect(done).toHaveBeenCalled()
  })

  it('shows the backend error when a credential was already used', async () => {
    apiMock.checkIn.mockRejectedValue(new ApiError({ status: 409, detail: 'Registration has already been checked in' }))
    renderWithProviders(<CheckInPanel />)
    await userEvent.type(screen.getByLabelText(/qr credential/i), CRED)
    await userEvent.click(screen.getByRole('button', { name: /check in/i }))
    expect(await screen.findByRole('alert')).toHaveTextContent('already been checked in')
    expect(screen.queryByText(/is checked in/)).not.toBeInTheDocument()
  })
})
