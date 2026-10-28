import { useEffect, useState } from 'react'
import { Link, NavLink } from 'react-router-dom'
import { useAuth } from '@/auth/AuthProvider'
import { initials } from '@/lib/format'
import {
  getInstallPrompt,
  clearInstallPrompt,
  type BeforeInstallPromptEvent,
} from '@/pwaInstall'
import { Button, LinkButton } from '../ui/Button'
import { Logo } from './Logo'
import { NotificationBell } from './NotificationBell'

export function SiteHeader() {
  const { status, profile, account, signOut } = useAuth()
  const [open, setOpen] = useState(false)
  const [installPrompt, setInstallPrompt] =
    useState<BeforeInstallPromptEvent | null>(() => getInstallPrompt())
  const [installMessage, setInstallMessage] = useState('')
  const [isInstalled, setIsInstalled] = useState(false)

  useEffect(() => {
    const checkInstalled = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        ('standalone' in navigator &&
          (navigator as Navigator & { standalone?: boolean }).standalone === true)

      setIsInstalled(standalone)
    }

    const handlePromptAvailable = () => {
      setInstallPrompt(getInstallPrompt())
      setInstallMessage('')
    }

    const handleInstalled = () => {
      setIsInstalled(true)
      setInstallPrompt(null)
      clearInstallPrompt()
      setInstallMessage('EventHub has been installed successfully!')
    }

    checkInstalled()

    const standaloneQuery = window.matchMedia('(display-mode: standalone)')
    standaloneQuery.addEventListener('change', checkInstalled)

    window.addEventListener('pwa-install-available', handlePromptAvailable)
    window.addEventListener('appinstalled', handleInstalled)

    return () => {
      standaloneQuery.removeEventListener('change', checkInstalled)
      window.removeEventListener('pwa-install-available', handlePromptAvailable)
      window.removeEventListener('appinstalled', handleInstalled)
    }
  }, [])

  const handleInstall = async () => {
    setInstallMessage('')

    if (isInstalled) {
      setInstallMessage('EventHub is already installed on this device.')
      return
    }

    const promptEvent = installPrompt ?? getInstallPrompt()

    if (!promptEvent) {
      setInstallMessage(
        'Chrome has not provided the installation prompt yet. Please check Chrome’s three-dot menu for Install EventHub app.'
      )
      return
    }

    try {
      await promptEvent.prompt()

      const choice = await promptEvent.userChoice

      clearInstallPrompt()
      setInstallPrompt(null)

      if (choice.outcome === 'accepted') {
        setInstallMessage('EventHub installation was accepted.')
      } else {
        setInstallMessage('Installation was cancelled.')
      }
    } catch (error) {
      console.error('EventHub installation prompt failed:', error)
      setInstallMessage(
        'The installation prompt could not be opened. Please try Chrome’s Install EventHub app option.'
      )
    }
  }

  const dashboardPath = profile?.role === 'CLUB' ? '/club' : '/dashboard'
  const dashboardLabel =
    profile?.role === 'CLUB' ? 'Club dashboard' : 'My dashboard'
  const signedIn = status === 'signed-in' && profile

  const links = [
    { to: '/events', label: 'Events' },
    { to: '/clubs', label: 'Clubs' },
    { to: '/verify', label: 'Verify certificate' },
    ...(signedIn
      ? [
          profile.onboarding_completed
            ? { to: dashboardPath, label: dashboardLabel }
            : { to: '/onboarding', label: 'Finish setup' },
        ]
      : []),
  ]

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    `rounded-lg px-3 py-2 text-[15px] font-semibold transition-colors ${
      isActive
        ? 'bg-charcoal text-cream'
        : 'text-charcoal hover:bg-charcoal/5'
    }`

  return (
    <header className="sticky top-0 z-30 border-b border-line bg-cream/90 backdrop-blur">
      <a
        href="#main"
        className="sr-only focus:not-sr-only focus:absolute focus:left-3 focus:top-3 focus:z-50 focus:rounded-lg focus:bg-white focus:px-3 focus:py-2"
      >
        Skip to content
      </a>

      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-4 py-3 sm:px-6">
        <Link to="/" aria-label="EventHub home">
          <Logo />
        </Link>

        <nav aria-label="Main" className="hidden items-center gap-1 md:flex">
          {links.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={linkClass}
              end={link.to === '/'}
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="hidden items-center gap-3 md:flex">
          {signedIn ? (
            <>
              <NotificationBell />

              <span
                className="flex h-9 w-9 items-center justify-center rounded-full bg-blue-50 text-sm font-extrabold text-blue-700"
                title={profile.email ?? undefined}
                aria-hidden="true"
              >
                {initials(profile.full_name ?? account?.name)}
              </span>

              <Button
                variant="outline"
                size="sm"
                onClick={() => void signOut()}
              >
                Sign out
              </Button>
            </>
          ) : status === 'loading' ? null : (
            <>
              {!isInstalled && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => void handleInstall()}
                >
                  Install app
                </Button>
              )}

              <LinkButton to="/sign-in" size="sm">
                Sign in
              </LinkButton>
            </>
          )}
        </div>

        <div className="flex items-center gap-2 md:hidden">
          {signedIn && <NotificationBell />}

          <button
            type="button"
            className="inline-flex h-11 w-11 items-center justify-center rounded-xl border border-line bg-white"
            aria-expanded={open}
            aria-controls="mobile-nav"
            aria-label={open ? 'Close menu' : 'Open menu'}
            onClick={() => setOpen((current) => !current)}
          >
            <svg
              width="22"
              height="22"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.2"
              strokeLinecap="round"
              aria-hidden="true"
            >
              {open ? (
                <path d="M6 6l12 12M18 6L6 18" />
              ) : (
                <path d="M4 7h16M4 12h16M4 17h16" />
              )}
            </svg>
          </button>
        </div>
      </div>

      {open && (
        <nav
          id="mobile-nav"
          aria-label="Mobile"
          className="border-t border-line bg-cream px-4 pb-4 pt-2 md:hidden"
        >
          <ul className="flex flex-col gap-1">
            {links.map((link) => (
              <li key={link.to}>
                <NavLink
                  to={link.to}
                  className={(state) => `block ${linkClass(state)}`}
                  onClick={() => setOpen(false)}
                >
                  {link.label}
                </NavLink>
              </li>
            ))}
          </ul>

          <div className="mt-3 border-t border-line pt-3">
            {signedIn ? (
              <Button
                variant="outline"
                className="w-full"
                onClick={() => void signOut()}
              >
                Sign out {profile.email ? `(${profile.email})` : ''}
              </Button>
            ) : status === 'loading' ? null : (
              <>
                {!isInstalled && (
                  <Button
                    variant="outline"
                    className="mb-2 w-full"
                    onClick={() => {
                      setOpen(false)
                      void handleInstall()
                    }}
                  >
                    Install EventHub
                  </Button>
                )}

                <LinkButton
                  to="/sign-in"
                  className="w-full"
                  onClick={() => setOpen(false)}
                >
                  Sign in
                </LinkButton>
              </>
            )}
          </div>
        </nav>
      )}

      {installMessage && (
        <p
          role="status"
          className="px-4 pb-2 text-center text-sm text-charcoal"
        >
          {installMessage}
        </p>
      )}
    </header>
  )
}
