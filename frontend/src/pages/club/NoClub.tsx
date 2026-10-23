import { LinkButton } from '@/components/ui/Button'
import { EmptyState } from '@/components/ui/States'
import { useAuth } from '@/auth/AuthProvider'

/** Shown wherever a club is needed but none is linked to this account's email. */
export function NoClub() {
  const { profile } = useAuth()
  return (
    <EmptyState title="No club is linked to your account yet" action={<LinkButton to="/club/profile">Create your club</LinkButton>}>
      The backend lets a club account manage only the club whose contact email is{' '}
      <strong>{profile?.email ?? 'your account email'}</strong>. Create the club profile to start hosting events.
    </EmptyState>
  )
}
