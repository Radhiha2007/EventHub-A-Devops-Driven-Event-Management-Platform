/**
 * The backend returns the QR credential in plain text only at registration / re-issue (it stores
 * just a hash). Registrations themselves come from GET /api/registrations/me; this localStorage
 * cache only remembers the latest credential on this browser so the QR can be shown again without
 * re-issuing. If it is missing, the UI calls POST /api/registrations/{id}/qr-credential for a new one.
 */
export interface StoredTicket {
  registrationId: string
  eventId: string
  credential: string
  registeredAt: string
}

const key = (userId: string) => `eventhub:tickets:${userId}`

export function loadTickets(userId: string): StoredTicket[] {
  try {
    const raw = localStorage.getItem(key(userId))
    const parsed = raw ? JSON.parse(raw) : []
    return Array.isArray(parsed) ? parsed : []
  } catch {
    return []
  }
}

export function saveTicket(userId: string, ticket: StoredTicket): boolean {
  try {
    const rest = loadTickets(userId).filter((t) => t.eventId !== ticket.eventId)
    localStorage.setItem(key(userId), JSON.stringify([ticket, ...rest]))
    return true
  } catch {
    return false
  }
}

export function removeTicket(userId: string, registrationId: string) {
  try {
    localStorage.setItem(key(userId), JSON.stringify(loadTickets(userId).filter((t) => t.registrationId !== registrationId)))
  } catch {
    /* ignore */
  }
}

export function findTicket(userId: string, eventId: string): StoredTicket | undefined {
  return loadTickets(userId).find((t) => t.eventId === eventId)
}
