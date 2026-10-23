import { useState } from 'react'
import { Link } from 'react-router-dom'
import type { Club, EventItem } from '@/api/types'
import { formatDate, formatTimeRange } from '@/lib/format'
import { StatusBadge } from './ui/Badge'

const accents = [
  { bar: 'bg-coral', soft: 'bg-coral-50', text: 'text-coral-700' },
  { bar: 'bg-emerald', soft: 'bg-emerald-50', text: 'text-emerald-700' },
  { bar: 'bg-blue', soft: 'bg-blue-50', text: 'text-blue-700' },
]
export function accentFor(key: string) {
  let h = 0
  for (const c of key) h = (h * 31 + c.charCodeAt(0)) >>> 0
  return accents[h % accents.length]
}

export function Poster({ event, className = '' }: { event: EventItem; className?: string }) {
  const [failed, setFailed] = useState(false)
  const a = accentFor(event.category)
  if (event.poster_url && !failed) {
    return (
      <img
        src={event.poster_url}
        alt=""
        loading="lazy"
        onError={() => setFailed(true)}
        className={`object-cover ${className}`}
      />
    )
  }
  return (
    <div className={`relative overflow-hidden ${a.soft} ${className}`} aria-hidden="true">
      <span className={`absolute -right-6 -top-6 h-28 w-28 rounded-full ${a.bar} opacity-90`} />
      <span className="absolute bottom-4 left-5 h-10 w-10 rotate-12 rounded-xl bg-white/80" />
      <span className="absolute bottom-6 left-20 h-4 w-4 rounded-full bg-charcoal/80" />
    </div>
  )
}

export function EventCard({ event, club }: { event: EventItem; club?: Club }) {
  const a = accentFor(event.category)
  return (
    <article className="group relative flex flex-col overflow-hidden rounded-card border border-line bg-white shadow-card transition-transform hover:-translate-y-0.5">
      <Poster event={event} className="h-36 w-full" />
      <div className="flex flex-1 flex-col gap-3 p-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className={`rounded-full px-2.5 py-0.5 text-xs font-bold ${a.soft} ${a.text}`}>{event.category}</span>
          <StatusBadge status={event.status} />
        </div>
        <h3 className="text-lg font-extrabold leading-snug">
          <Link to={`/events/${event.id}`} className="after:absolute after:inset-0 after:content-[''] focus-visible:outline-offset-[-3px]">
            {event.title}
          </Link>
        </h3>
        <dl className="space-y-1 text-sm text-ink-soft">
          <div className="flex gap-2"><dt className="sr-only">Date</dt><dd className="font-semibold text-charcoal">{formatDate(event.event_date)}</dd></div>
          <div className="flex gap-2"><dt className="sr-only">Time</dt><dd>{formatTimeRange(event.start_time, event.end_time)}</dd></div>
          <div className="flex gap-2"><dt className="sr-only">Venue</dt><dd>{event.venue}</dd></div>
        </dl>
        {club && <p className="mt-auto pt-1 text-sm font-semibold text-blue-700">by {club.name}</p>}
      </div>
    </article>
  )
}
