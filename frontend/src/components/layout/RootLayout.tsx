import { useEffect } from 'react'
import { Outlet, useLocation, useNavigate } from 'react-router-dom'
import { takeReturnTo, useAuth } from '@/auth/AuthProvider'
import { SiteFooter } from './SiteFooter'
import { SiteHeader } from './SiteHeader'

export function RootLayout() {
  const { status, profile } = useAuth()
  const navigate = useNavigate()
  const { pathname } = useLocation()

  // After the Microsoft redirect lands on "/", send the user where they were heading.
  useEffect(() => {
    if (status !== 'signed-in' || !profile) return
    const returnTo = takeReturnTo()
    if (!profile.onboarding_completed) {
      if (pathname !== '/onboarding') navigate('/onboarding', { replace: true })
    } else if (returnTo) {
      navigate(returnTo, { replace: true })
    }
  }, [status, profile, navigate, pathname])

  useEffect(() => {
    window.scrollTo(0, 0)
  }, [pathname])

  return (
    <div className="flex min-h-screen flex-col">
      <SiteHeader />
      <main id="main" className="flex-1">
        <Outlet />
      </main>
      <SiteFooter />
    </div>
  )
}
