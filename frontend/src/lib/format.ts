/** Backend datetimes without a zone (registration_deadline, created_at, ...) are UTC. */
export function parseUtc(value: string): Date {
  return new Date(/[zZ]|[+-]\d\d:?\d\d$/.test(value) ? value : value + 'Z')
}

/** "2026-11-09" -> local Date at midnight (avoids the UTC off-by-one of new Date("YYYY-MM-DD")). */
export function parseDateOnly(value: string): Date {
  const [y, m, d] = value.split('-').map(Number)
  return new Date(y, (m ?? 1) - 1, d ?? 1)
}

export function formatDate(value: string, opts?: Intl.DateTimeFormatOptions): string {
  return parseDateOnly(value).toLocaleDateString(undefined, {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    ...opts,
  })
}

export function formatTime(value: string): string {
  const [h, m] = value.split(':').map(Number)
  const d = new Date()
  d.setHours(h ?? 0, m ?? 0, 0, 0)
  return d.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })
}

export function formatTimeRange(start: string, end: string): string {
  return `${formatTime(start)} – ${formatTime(end)}`
}

export function formatDateTimeUtc(value: string): string {
  return parseUtc(value).toLocaleString(undefined, {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  })
}

/** Value for <input type="datetime-local"> (local time) from a backend UTC datetime. */
export function utcToLocalInput(value: string): string {
  const d = parseUtc(value)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

/** <input type="datetime-local"> value (local time) -> naive UTC string the backend expects. */
export function localInputToUtc(value: string): string {
  return new Date(value).toISOString().slice(0, 19)
}

/** "HH:MM" from <input type="time"> -> "HH:MM:SS". */
export function toApiTime(value: string): string {
  return value.length === 5 ? value + ':00' : value
}

export function toInputTime(value: string): string {
  return value.slice(0, 5)
}

export function titleCase(value: string): string {
  return value.charAt(0) + value.slice(1).toLowerCase()
}

/** Mirrors the backend rule (status UPCOMING and deadline not passed) for UI hints only. */
export function isRegistrationWindowOpen(e: { status: string; registration_deadline: string }): boolean {
  return e.status === 'UPCOMING' && parseUtc(e.registration_deadline).getTime() > Date.now()
}

export function initials(name: string | null | undefined): string {
  if (!name) return '?'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || '?'
}
