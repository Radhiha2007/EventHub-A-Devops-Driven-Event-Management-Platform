import type { ReactNode } from 'react'
import type { UseQueryResult } from '@tanstack/react-query'
import { PageLoader } from './ui/Spinner'
import { ErrorState } from './ui/States'

/**
 * Renders loading / error / data for a query. An error is never shown as an empty list.
 * The caller decides what "empty" looks like inside `children`.
 */
export function QueryBoundary<T>({
  query,
  children,
  loadingLabel,
}: {
  query: UseQueryResult<T>
  children: (data: T) => ReactNode
  loadingLabel?: string
}) {
  if (query.isPending) return <PageLoader label={loadingLabel} />
  if (query.isError) return <ErrorState error={query.error} onRetry={() => void query.refetch()} />
  return <>{children(query.data)}</>
}
