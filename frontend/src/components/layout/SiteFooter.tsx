import { Link } from 'react-router-dom'
import { Logo } from './Logo'

export function SiteFooter() {
  return (
    <footer className="mt-20 border-t border-line bg-white/60">
      <div className="mx-auto grid max-w-6xl gap-8 px-4 py-10 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div>
          <Logo />
          <p className="mt-3 max-w-xs text-sm text-ink-soft">
            Discover what's happening on campus, register in a tap, and keep every certificate you earn.
          </p>
        </div>
        <nav aria-label="Explore" className="text-sm">
          <p className="mb-2 font-extrabold">Explore</p>
          <ul className="space-y-1.5 text-ink-soft">
            <li><Link className="hover:text-charcoal hover:underline" to="/events">Events</Link></li>
            <li><Link className="hover:text-charcoal hover:underline" to="/clubs">Clubs</Link></li>
            <li><Link className="hover:text-charcoal hover:underline" to="/verify">Verify a certificate</Link></li>
          </ul>
        </nav>
        <nav aria-label="Account" className="text-sm">
          <p className="mb-2 font-extrabold">Account</p>
          <ul className="space-y-1.5 text-ink-soft">
            <li><Link className="hover:text-charcoal hover:underline" to="/sign-in">Sign in with Microsoft</Link></li>
            <li><Link className="hover:text-charcoal hover:underline" to="/onboarding">Choose student or club role</Link></li>
          </ul>
        </nav>
      </div>
    </footer>
  )
}
