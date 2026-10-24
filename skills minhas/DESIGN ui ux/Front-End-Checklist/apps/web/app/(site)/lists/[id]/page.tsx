import { ROUTES } from '@repo/config'
import type { Metadata } from 'next'
import { generateSEOMetadata } from '@/lib/seo'
import { QueryProvider } from '@/providers/query-provider'
import { UserChecklistDetailPage } from './page-client'

interface PageProps {
  params: Promise<{ id: string }>
}

/**
 * generateMetadata function.
 * @param { params } - { params }.
 */
export async function generateMetadata({ params }: PageProps): Promise<Metadata> {
  await params

  return generateSEOMetadata({
    title: 'Checklist Details',
    description: 'View and manage a custom checklist for tracking frontend work.',
    path: ROUTES.lists,
    noIndex: true
  })
}

export default function Page() {
  return (
    <QueryProvider>
      <UserChecklistDetailPage />
    </QueryProvider>
  )
}
