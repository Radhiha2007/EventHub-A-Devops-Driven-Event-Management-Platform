import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ApiError } from '@/api/client'
import { baseEvent, renderWithProviders, student } from '@/test/utils'
import { CertificatesPage } from './CertificatesPage'

vi.mock('@/auth/AuthProvider', () => ({ useAuth: () => ({ status: 'signed-in', profile: student }) }))

const apiMock = vi.hoisted(() => ({ listMyCertificates: vi.fn(), getEvent: vi.fn(), downloadCertificate: vi.fn() }))
vi.mock('@/api/endpoints', () => ({ api: apiMock }))

const cert = {
  id: '66666666-6666-4666-8666-666666666666', event_id: baseEvent.id, recipient_id: student.id,
  recipient_name: 'Stu Dent', certificate_code: 'EVH-ABC123', issued_at: '2026-10-20T10:00:00',
}

beforeEach(() => {
  vi.clearAllMocks()
  apiMock.listMyCertificates.mockResolvedValue([cert])
  apiMock.getEvent.mockResolvedValue(baseEvent)
  URL.createObjectURL = vi.fn(() => 'blob:fake')
  URL.revokeObjectURL = vi.fn()
})
afterEach(() => vi.restoreAllMocks())

const renderPage = () => renderWithProviders(<CertificatesPage />)

describe('Certificates → Download PDF', () => {
  it('keeps the existing verify and copy-link actions next to the new button', async () => {
    renderPage()
    expect(await screen.findByRole('button', { name: 'Download PDF' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /open verification page/i })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /copy verification link/i })).toBeInTheDocument()
  })

  it('shows a loading state, downloads using the certificate id, and saves the file', async () => {
    let finish!: (v: { blob: Blob; filename: string | null }) => void
    apiMock.downloadCertificate.mockReturnValue(new Promise((r) => { finish = r }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderPage()
    const button = await screen.findByRole('button', { name: 'Download PDF' })
    await userEvent.click(button)
    expect(apiMock.downloadCertificate).toHaveBeenCalledWith(cert.id)
    await waitFor(() => expect(button).toBeDisabled()) // loading
    finish({ blob: new Blob(['%PDF']), filename: null })
    await waitFor(() => expect(click).toHaveBeenCalledTimes(1))
    expect(URL.createObjectURL).toHaveBeenCalled()
    await waitFor(() => expect(button).toBeEnabled())
    expect(screen.queryByRole('alert')).not.toBeInTheDocument()
  })

  it('shows the backend message and does not claim success when the download fails', async () => {
    apiMock.downloadCertificate.mockRejectedValue(new ApiError({ status: 403, detail: 'You can only download your own certificates' }))
    const click = vi.spyOn(HTMLAnchorElement.prototype, 'click').mockImplementation(() => {})
    renderPage()
    await userEvent.click(await screen.findByRole('button', { name: 'Download PDF' }))
    expect(await screen.findByRole('alert')).toHaveTextContent('You can only download your own certificates')
    expect(click).not.toHaveBeenCalled()
    expect(screen.getByRole('button', { name: 'Download PDF' })).toBeEnabled() // can retry
  })

  it('still shows the empty state when there are no certificates', async () => {
    apiMock.listMyCertificates.mockResolvedValue([])
    renderPage()
    expect(await screen.findByText('No certificates yet')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Download PDF' })).not.toBeInTheDocument()
  })
})
