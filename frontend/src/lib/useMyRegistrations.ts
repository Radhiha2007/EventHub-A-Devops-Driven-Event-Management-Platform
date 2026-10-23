import { useQuery } from '@tanstack/react-query'
import { api } from '@/api/endpoints'
import { useAuth } from '@/auth/AuthProvider'

/** The signed-in student's registrations (GET /api/registrations/me). Disabled for non-students. */
export function useMyRegistrations() {
  const { status, profile } = useAuth()
  const enabled = status === 'signed-in' && profile?.role === 'STUDENT' && profile.onboarding_completed
  return useQuery({ queryKey: ['my-registrations', profile?.id], queryFn: () => api.listMyRegistrations(), enabled })
}
