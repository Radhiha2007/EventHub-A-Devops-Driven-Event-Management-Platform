/**
 * Types mirror the backend Pydantic schemas exactly (field names unchanged).
 * Source: backend/app/schemas/*.py and backend/app/models/*.py
 */

export type UserRole = 'STUDENT' | 'CLUB'
export type EventStatus = 'UPCOMING' | 'ONGOING' | 'COMPLETED' | 'CANCELLED'
export type NotificationType = 'EVENT_REMINDER' | 'EVENT_UPDATE' | 'REGISTRATION' | 'GENERAL'

export const EVENT_STATUSES: EventStatus[] = ['UPCOMING', 'ONGOING', 'COMPLETED', 'CANCELLED']

/** Mirrors allowed_transitions in backend/app/services/event.py */
export const STATUS_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  UPCOMING: ['ONGOING', 'COMPLETED', 'CANCELLED'],
  ONGOING: ['COMPLETED', 'CANCELLED'],
  COMPLETED: [],
  CANCELLED: [],
}

export interface UserProfile {
  id: string
  email: string | null
  full_name: string | null
  role: UserRole
  onboarding_completed: boolean
  is_active: boolean
}

export interface Club {
  id: string
  name: string
  description: string | null
  contact_email: string | null
  advisor_name: string | null
  created_at: string
}
export interface ClubCreate {
  name: string
  description?: string | null
  contact_email?: string | null
  advisor_name?: string | null
}
export type ClubUpdate = Partial<ClubCreate>

export interface EventItem {
  id: string
  club_id: string
  title: string
  description: string | null
  category: string
  venue: string
  poster_url: string | null
  /** YYYY-MM-DD */
  event_date: string
  /** HH:MM:SS */
  start_time: string
  /** HH:MM:SS */
  end_time: string
  capacity: number
  /** Naive datetime; the backend compares it with datetime.utcnow(), so it is UTC. */
  registration_deadline: string
  status: EventStatus
  created_at: string
}
export interface EventCreate {
  club_id: string
  title: string
  description?: string | null
  category: string
  venue: string
  poster_url?: string | null
  event_date: string
  start_time: string
  end_time: string
  capacity: number
  registration_deadline: string
}
export type EventUpdate = Partial<Omit<EventCreate, 'club_id'>>

export interface EventListParams {
  search?: string
  category?: string
  event_date?: string
  club_id?: string
  event_status?: EventStatus
}

export interface Registration {
  id: string
  event_id: string
  attendee_name: string
  attendee_email: string
  registered_at: string
  checked_in_at: string | null
}
export interface RegistrationCreated extends Registration {
  qr_credential: string
}
/** GET /api/registrations/me item: registration + its event. */
export interface StudentRegistration extends Registration {
  event: EventItem
}
export interface RegistrationCredential {
  qr_credential: string
}
export interface CheckInResponse {
  registration_id: string
  event_id: string
  attendee_name: string
  checked_in_at: string
}

export interface Feedback {
  id: string
  event_id: string
  rating: number
  comments: string | null
  created_at: string
}
export interface FeedbackCreate {
  event_id: string
  rating: number
  comments?: string | null
}

export interface AppNotification {
  id: string
  recipient_id: string
  title: string
  message: string
  notification_type: NotificationType
  is_read: boolean
  created_at: string
}

export interface Certificate {
  id: string
  event_id: string
  recipient_id: string
  recipient_name: string
  certificate_code: string
  issued_at: string
}
export interface CertificateIssue {
  event_id: string
  recipient_id: string
  recipient_name: string
}
export interface CertificateVerification {
  valid: boolean
  certificate_code: string
  event_id: string
  recipient_name: string
  issued_at: string
}

export interface AuthMe {
  authenticated: boolean
  user_id: string | null
  tenant_id: string | null
  name: string | null
  username: string | null
  scopes: string[]
}
