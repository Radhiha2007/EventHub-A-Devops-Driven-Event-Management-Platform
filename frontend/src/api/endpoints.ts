/**
 * One function per backend route that exists in the supplied source.
 * Each entry notes the router + auth rule it was verified against.
 */
import { request, requestBlob } from './client'
import type {
  AppNotification,
  AuthMe,
  Certificate,
  CertificateIssue,
  CertificateVerification,
  CheckInResponse,
  Club,
  ClubCreate,
  ClubUpdate,
  EventCreate,
  EventItem,
  EventListParams,
  EventStatus,
  EventUpdate,
  Feedback,
  FeedbackCreate,
  Registration,
  RegistrationCreated,
  RegistrationCredential,
  StudentRegistration,
  UserProfile,
  UserRole,
} from './types'

export const api = {
  health: () => request<{ status: string; service: string }>('/health'),

  // main.py
  authMe: () => request<AuthMe>('/auth/me', { auth: true }),

  // routers/users.py
  getMyProfile: () => request<UserProfile>('/users/me', { auth: true }),
  completeOnboarding: (role: UserRole) =>
    request<UserProfile>('/users/me/onboarding', { method: 'POST', auth: true, body: { role } }),

  // routers/clubs.py — GET public; POST/PUT require CLUB role + email match
  listClubs: () => request<Club[]>('/api/clubs'),
  getClub: (id: string) => request<Club>(`/api/clubs/${id}`),
  createClub: (data: ClubCreate) =>
    request<Club>('/api/clubs', { method: 'POST', auth: true, body: data }),
  updateClub: (id: string, data: ClubUpdate) =>
    request<Club>(`/api/clubs/${id}`, { method: 'PUT', auth: true, body: data }),

  // routers/events.py — GET public; POST/PUT/PATCH status require CLUB role + email match
  listEvents: (params: EventListParams = {}) =>
    request<EventItem[]>('/api/events', { query: { ...params } }),
  getEvent: (id: string) => request<EventItem>(`/api/events/${id}`),
  createEvent: (data: EventCreate) =>
    request<EventItem>('/api/events', { method: 'POST', auth: true, body: data }),
  updateEvent: (id: string, data: EventUpdate) =>
    request<EventItem>(`/api/events/${id}`, { method: 'PUT', auth: true, body: data }),
  updateEventStatus: (id: string, status: EventStatus) =>
    request<EventItem>(`/api/events/${id}/status`, {
      method: 'PATCH',
      auth: true,
      body: { status },
    }),
  deleteEvent: (id: string) =>
    request<void>(`/api/events/${id}`, {
      method: 'DELETE',
      auth: true,
    }),

  // routers/registrations.py
  /** STUDENT only. The backend takes identity from the token; the body is not read. */
  registerForEvent: (eventId: string) =>
    request<RegistrationCreated>(`/api/events/${eventId}/registrations`, {
      method: 'POST',
      auth: true,
    }),
  /** STUDENT only: the signed-in student's registrations (with event). */
  listMyRegistrations: () => request<StudentRegistration[]>('/api/registrations/me', { auth: true }),
  /** STUDENT only. Issues a NEW QR credential and invalidates the previous one. 409 if already checked in. */
  reissueQr: (registrationId: string) =>
    request<RegistrationCredential>(`/api/registrations/${registrationId}/qr-credential`, {
      method: 'POST',
      auth: true,
    }),
  /** CLUB only, must own the event. */
  listEventRegistrations: (eventId: string) =>
    request<Registration[]>(`/api/events/${eventId}/registrations`, { auth: true }),
  /** CLUB only, must own the event the credential belongs to. */
  checkIn: (credential: string) =>
    request<CheckInResponse>('/api/attendance/check-in', {
      method: 'POST',
      auth: true,
      body: { credential },
    }),

  // routers/feedback.py — POST: STUDENT who was checked in to a COMPLETED event; GET is public
  submitFeedback: (data: FeedbackCreate) =>
    request<Feedback>('/api/feedback', { method: 'POST', auth: true, body: data }),
  listEventFeedback: (eventId: string) => request<Feedback[]>(`/api/feedback/event/${eventId}`),

  // routers/notifications.py — authenticated; recipient must be the signed-in user
  listNotifications: (recipientId: string, unreadOnly = false) =>
    request<AppNotification[]>(`/api/notifications/recipient/${encodeURIComponent(recipientId)}`, {
      auth: true,
      query: { unread_only: unreadOnly || undefined },
    }),
  setNotificationRead: (id: string, isRead: boolean) =>
    request<AppNotification>(`/api/notifications/${id}/read`, {
      method: 'PATCH',
      auth: true,
      body: { is_read: isRead },
    }),

  // routers/certificates.py
  /** CLUB only (checked in the service layer), must own the event. */
  issueCertificate: (data: CertificateIssue) =>
    request<Certificate>('/api/certificates/issue', { method: 'POST', auth: true, body: data }),
  /** STUDENT only, recipientId must equal own profile id. */
  listMyCertificates: (recipientId: string) =>
    request<Certificate[]>(`/api/certificates/recipient/${encodeURIComponent(recipientId)}`, {
      auth: true,
    }),
  /** STUDENT only, own certificates only. Returns the generated PDF. */
  downloadCertificate: (id: string) => requestBlob(`/api/certificates/${encodeURIComponent(id)}/download`),
  /** Public. */
  verifyCertificate: (code: string) =>
    request<CertificateVerification>(`/api/certificates/verify/${encodeURIComponent(code)}`),
}
