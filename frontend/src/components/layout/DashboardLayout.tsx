import { NavLink, Outlet } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { initials } from '@/lib/format'
import { Pill } from '../ui/Badge'

export interface DashNavItem {
  to: string
  label: string
  end?: boolean
}

export function DashboardLayout({ title, items }: { title: string; items: DashNavItem[] }) {
  const { profile } = useAuth()
  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6">
      <div className="mb-6 flex flex-wrap items-center gap-4">
        <span className="flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-lg font-extrabold text-emerald-700" aria-hidden="true">
          {initials(profile?.full_name)}
        </span>
        <div className="min-w-0">
          <p className="text-xs font-extrabold uppercase tracking-widest text-coral-600">{title}</p>
          <h1 className="truncate text-2xl font-extrabold tracking-tight">{profile?.full_name ?? profile?.email ?? 'Welcome'}</h1>
        </div>
        <Pill tone={profile?.role === 'CLUB' ? 'blue' : 'green'}>{profile?.role === 'CLUB' ? 'Club account' : 'Student account'}</Pill>
      </div>
      <div className="grid grid-cols-[minmax(0,1fr)] gap-6 md:grid-cols-[220px_minmax(0,1fr)]">
        <nav aria-label={`${title} sections`} className="min-w-0 md:sticky md:top-24 md:self-start">
          <ul className="flex gap-1 overflow-x-auto pb-1 md:flex-col md:overflow-visible">
            {items.map((i) => (
              <li key={i.to} className="shrink-0">
                <NavLink
                  to={i.to}
                  end={i.end}
                  className={({ isActive }) =>
                    `block whitespace-nowrap rounded-xl px-3.5 py-2.5 text-[15px] font-semibold transition-colors ${
                      isActive ? 'bg-charcoal text-cream' : 'bg-white text-charcoal ring-1 ring-line hover:bg-cream-100'
                    }`
                  }
                >
                  {i.label}
                </NavLink>
              </li>
            ))}
          </ul>
        </nav>
        <div className="min-w-0">
          <Outlet />
        </div>
      </div>
    </div>
  )
}
