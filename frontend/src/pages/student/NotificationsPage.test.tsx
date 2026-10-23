import { beforeEach, describe, expect, it, vi } from 'vitest'
import { screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { renderWithProviders, student } from '@/test/utils'
import { NotificationsPage } from './NotificationsPage'

vi.mock('@/auth/AuthProvider', () => ({ useAuth: () => ({ status: 'signed-in', profile: student }) }))
const apiMock = vi.hoisted(() => ({ listNotifications: vi.fn(), setNotificationRead: vi.fn() }))
vi.mock('@/api/endpoints', () => ({ api: apiMock }))

const n = (over = {}) => ({
  id: 'n1', recipient_id: student.id, title: 'Certificate issued', message: "Your certificate for 'Hack Night' has been issued and is ready to view.",
  notification_type: 'GENERAL', is_read: false, created_at: '2026-10-20T10:00:00', ...over,
})
beforeEach(() => vi.clearAllMocks())

describe('Notifications page', () => {
  it('loads notifications for the signed-in student id and shows backend-created ones', async () => {
    apiMock.listNotifications.mockResolvedValue([n(), n({ id: 'n2', title: 'Event cancelled', notification_type: 'EVENT_UPDATE', is_read: true })])
    renderWithProviders(<NotificationsPage />)
    expect(await screen.findByText('Certificate issued')).toBeInTheDocument()
    expect(screen.getByText('Event cancelled')).toBeInTheDocument()
    expect(apiMock.listNotifications).toHaveBeenCalledWith(student.id, false)
  })

  it('marks a notification as read through the API', async () => {
    apiMock.listNotifications.mockResolvedValue([n()])
    apiMock.setNotificationRead.mockResolvedValue(n({ is_read: true }))
    renderWithProviders(<NotificationsPage />)
    await userEvent.click(await screen.findByRole('button', { name: 'Mark as read' }))
    expect(apiMock.setNotificationRead).toHaveBeenCalledWith('n1', true)
  })

  it('does not break on a notification type the frontend does not know', async () => {
    apiMock.listNotifications.mockResolvedValue([n({ notification_type: 'SOMETHING_NEW' })])
    renderWithProviders(<NotificationsPage />)
    expect(await screen.findByText('SOMETHING_NEW')).toBeInTheDocument()
  })

  it('explains what will appear when there are none (no longer claims nothing is sent automatically)', async () => {
    apiMock.listNotifications.mockResolvedValue([])
    renderWithProviders(<NotificationsPage />)
    expect(await screen.findByText(/new events, changes to events you registered for, your attendance and issued certificates/i)).toBeInTheDocument()
    expect(screen.queryByText(/doesn’t send them automatically/)).not.toBeInTheDocument()
  })
})
