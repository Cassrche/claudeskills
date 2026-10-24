import { pageMetadata } from '@/lib/seo'
import { QueryProvider } from '@/providers/query-provider'
import { AuditsPageClient } from './audits-page-client'

export const metadata = pageMetadata.audits

export default async function AuditsPage() {
  return (
    <QueryProvider>
      <AuditsPageClient />
    </QueryProvider>
  )
}
