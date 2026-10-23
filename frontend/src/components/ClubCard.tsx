import { Link } from 'react-router-dom'
import type { Club } from '@/api/types'
import { accentFor } from './EventCard'

export function ClubCard({ club }: { club: Club }) {
  const a = accentFor(club.id)
  return (
    <article className="relative flex gap-4 rounded-card border border-line bg-white p-5 shadow-card transition-transform hover:-translate-y-0.5">
      <span className={`flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl text-lg font-extrabold ${a.soft} ${a.text}`} aria-hidden="true">
        {club.name.charAt(0).toUpperCase()}
      </span>
      <div className="min-w-0">
        <h3 className="text-lg font-extrabold leading-snug">
          <Link to={`/clubs/${club.id}`} className="after:absolute after:inset-0 after:content-['']">
            {club.name}
          </Link>
        </h3>
        <p className="mt-1 line-clamp-3 text-sm text-ink-soft">{club.description || 'No description yet.'}</p>
        {club.advisor_name && <p className="mt-2 text-xs font-semibold text-charcoal/70">Advisor: {club.advisor_name}</p>}
      </div>
    </article>
  )
}
