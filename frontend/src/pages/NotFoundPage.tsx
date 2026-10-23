import { LinkButton } from '@/components/ui/Button'

export function NotFoundPage() {
  return (
    <div className="mx-auto max-w-xl px-4 py-24 text-center">
      <p className="text-7xl font-extrabold text-coral" aria-hidden="true">404</p>
      <h1 className="mt-2 text-2xl font-extrabold">We couldn't find that page</h1>
      <p className="mt-2 text-ink-soft">The link may be broken, or the page may have moved.</p>
      <div className="mt-6 flex justify-center gap-3">
        <LinkButton to="/">Back home</LinkButton>
        <LinkButton to="/events" variant="outline">Browse events</LinkButton>
      </div>
    </div>
  )
}
